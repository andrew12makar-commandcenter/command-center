// Local-only audit queue safety checks. No third-party HTTP/API services.
// Lighthouse navigates an untrusted public URL; do not pass unchecked hosts.
import {BlockList,isIP} from 'node:net';
import {lookup} from 'node:dns/promises';

const privateNetworks=new BlockList();
for(const [address,prefix] of [
 ['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],
 ['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],
 ['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],
 ['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],
 ['240.0.0.0',4],
])privateNetworks.addSubnet(address,prefix,'ipv4');
for(const [address,prefix] of [
 ['::',128],['::1',128],['fc00::',7],
 ['fe80::',10],['ff00::',8],['2001:db8::',32],
])privateNetworks.addSubnet(address,prefix,'ipv6');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const localhostRe=/(^|\.)(?:localhost|local|internal|test|invalid)$/i;

export function publicAuditUrl(value){
 if(typeof value!=='string'||value.length>1500)throw Error('Invalid site URL.');
 let u;
 try{u=new URL(value);}catch{throw Error('Not a website URL.');}
 const host=u.hostname.toLowerCase().replace(/\.$/,'');
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||
   u.port||!host.includes('.')||localhostRe.test(host)||host.includes(':')||
   isIP(host))throw Error('Audit only public web domain URLs without ports or credentials.');
 if(host.endsWith('.example')||host.endsWith('.onion')||host==='metadata.google.internal')
  throw Error('This is not a publicly auditable company domain.');
 u.search='';u.hash='';
 return u.toString();
}

export function parseApprovedManifest(text,now=Date.now()){
 if(text.length>100_000)throw Error('Audit manifest is too large.');
 let manifest;
 try{manifest=JSON.parse(text);}catch{throw Error('Choose a Command Center audit manifest (.json).');}
 if(manifest?.kind!=='command-center-local-audit/v1'||!Array.isArray(manifest.businesses))
  throw Error('Not a Command Center approved audit manifest.');
 if(!Number.isFinite(Date.parse(manifest.expires_at))||
   Date.parse(manifest.expires_at)<=now||
   Date.parse(manifest.expires_at)>now+2*60*60*1000)
  throw Error('This queue has expired. Download a fresh approved queue from Command Center.');
 if(manifest.businesses.length<1||manifest.businesses.length>10)
  throw Error('Select between 1 and 10 approved CRM websites.');
 const seen=new Set();
 return manifest.businesses.map(row=>{
  if(!row||typeof row.name!=='string'||row.name.length>200||
     typeof row.id!=='string'||!uuid.test(row.id)||seen.has(row.id))
   throw Error('Audit queue has an invalid or duplicate CRM business.');
  seen.add(row.id);
  return {id:row.id,name:row.name,url:publicAuditUrl(row.website_url)};
 });
}
export function publicIp(address){
 const family=isIP(address);
 // Reject IPv4-mapped IPv6 explicitly; they bypass a simple IPv6-only range check.
 if(address.toLowerCase().startsWith('::ffff:'))return false;
 return family!==0&&!privateNetworks.check(address,family===4?'ipv4':'ipv6');
}
export async function checkPublicDns(url,resolver=lookup){
 const host=new URL(publicAuditUrl(url)).hostname;
 const records=await resolver(host,{all:true});
 if(!Array.isArray(records)||records.length===0||
   records.some(record=>!publicIp(record.address)))
  throw Error('DNS returned a non-public or unsafe IP address. This site was not scanned.');
 return records.map(record=>record.address);
}

// Check redirect targets before launching Chrome. This is a conservative
// safety preflight, NOT a network sandbox or protection from DNS rebinding.
export async function preflightPublicWebsite(input,{resolver=lookup,request=fetch}={}){
 let url=publicAuditUrl(input);
 for(let i=0;i<5;i++){
  await checkPublicDns(url,resolver);
  const headers={'User-Agent':'CommandCenterLighthousePilot/1.0 (manual local research)','Accept':'text/html'};
  let response=await request(url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(10000),headers});
  // Many hosts (Shopify, some CDNs) reject HEAD with 403/405 while serving a
  // normal GET. Ask once more with an ordinary GET, same honest user agent,
  // discarding the body. A refusal of THAT request is respected as a denial;
  // this is not an attempt to get past bot protection.
  if(response.status===403||response.status===405){
   response=await request(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(12000),headers});
   await response.body?.cancel?.().catch(()=>{});
  }
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location');
   if(!location)throw Error('Redirect without destination.');
   url=publicAuditUrl(new URL(location,url).toString());
   continue;
  }
  if(response.status===405||response.status===403||response.status===429)
   throw Error('Site denied the safety preflight (HTTP '+response.status+'); skipped.');
  if(response.status>=500)throw Error('Site unavailable during preflight (HTTP '+response.status+').');
  return url;
 }
 throw Error('Website redirects too many times to audit safely.');
}
