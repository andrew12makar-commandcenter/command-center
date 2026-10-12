// Business websites, social accounts and third-party listings are different
// types of evidence. A profile URL never proves the business lacks a website.
export type WebPresenceKind='website'|'social'|'listing'|'none'|'invalid';
export type WebPresence={kind:WebPresenceKind;url:string|null;provider:string|null};
const social:Record<string,string>={
 'instagram.com':'Instagram','facebook.com':'Facebook','fb.com':'Facebook',
 'threads.net':'Threads','tiktok.com':'TikTok','linkedin.com':'LinkedIn',
 'twitter.com':'X / Twitter','x.com':'X / Twitter','youtube.com':'YouTube',
 'youtu.be':'YouTube','pinterest.com':'Pinterest','snapchat.com':'Snapchat'
};
const listings:Record<string,string>={
 'maps.google.com':'Google Maps','g.page':'Google Business Profile',
 'business.google.com':'Google Business Profile','goo.gl':'Google short link',
 'yelp.com':'Yelp','yellowpages.com':'Yellow Pages',
 'tripadvisor.com':'Tripadvisor','nextdoor.com':'Nextdoor',
 'linktr.ee':'Linktree'
};
function providerFor(host:string,lookup:Record<string,string>):string|null{
 for(const [domain,provider] of Object.entries(lookup)){
  if(host===domain||host.endsWith('.'+domain))return provider;
 }
 return null;
}
export function classifyWebPresence(value:string|null|undefined):WebPresence{
 const raw=(value||'').trim();
 if(!raw)return {kind:'none',url:null,provider:null};
 try{
  const parsed=new URL(raw);
  const host=parsed.hostname.toLowerCase().replace(/\.$/,'');
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||
    !host.includes('.')||host==='localhost'||host.endsWith('.localhost')||
    host.endsWith('.local')||host.endsWith('.internal')||host.endsWith('.test')||
    host.endsWith('.invalid')||/^\d+\.\d+\.\d+\.\d+$/.test(host)||
    host.includes(':'))return {kind:'invalid',url:null,provider:null};
  const socialProvider=providerFor(host,social);
  if(socialProvider)return {kind:'social',url:parsed.toString(),provider:socialProvider};
  const listingProvider=providerFor(host,listings)||
   ((host==='google.com'||host.endsWith('.google.com'))&&
    /^\/(?:maps|local)(?:\/|$)/i.test(parsed.pathname)?'Google Maps':null);
  if(listingProvider)return {kind:'listing',url:parsed.toString(),provider:listingProvider};
  return {kind:'website',url:parsed.toString(),provider:null};
 }catch{return {kind:'invalid',url:null,provider:null};}
}
export function independentWebsite(value:string|null|undefined):string|null{
 const x=classifyWebPresence(value);
 return x.kind==='website'?x.url:null;
}
export function discoveredProfile(
 row:Record<string,unknown>|null|undefined,website:string|null|undefined
):string|null{
 const raw=row?.discovered_social_profile_url;
 if(typeof raw==='string'){
  const p=classifyWebPresence(raw);
  if(p.kind==='social'||p.kind==='listing')return p.url;
 }
 const current=classifyWebPresence(website);
 return current.kind==='social'||current.kind==='listing'?current.url:null;
}
export function validateBusinessWebsite(value:string|null|undefined):string|null{
 const result=classifyWebPresence(value);
 if(result.kind==='none')return null;
 if(result.kind!=='website'){
  throw new Error(result.kind==='social'||result.kind==='listing'?
   'This is a '+result.provider+' profile or listing, not a business website. Save it as social/directory evidence instead.':
   'Enter a valid, publicly reachable business website URL.');
 }
 return result.url;
}
