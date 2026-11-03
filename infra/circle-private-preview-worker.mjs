// Circle Tavern: private founder review proxy. Source-of-truth in Command Center private repo.
// Only unapproved HD preview traffic; never bound to Circle production or Campus2Care.
// The R2 bucket remains private; unauthenticated users must never receive source model bytes.
const SOURCE_ORIGIN = 'https://f3fcd0ce.venu-e60.pages.dev';
const AUTH_ISSUER = 'https://summer-morning-efc6.cloudflareaccess.com';
const AUTH_AUDIENCE = '5e3fdbfca81c897f9917101ac998238a5c5217d1b80372fef0fadd855e6a8bd5';
const ALLOWED_EMAILS = new Set(['andrew12makar@gmail.com', 'president@campus2care.org']);
const MODEL_PREFIX='models/';
const PART_SIZE=1500000;
const MODELS=Object.freeze({
  'main-bar.sog': {key:'main-bar', count:17, bytes:24695961, sha256:'40450dbeceaf6650205ea740067e7fba2246a5ddf4045ef252c2dd4162563e50'},
  'speakeasy-360.sog': {key:'speakeasy-360',count:16,bytes:23258604,sha256:'68034b4809a86eb521f9abe3250145af33a39aaadc91651d940629c8c67c9321'}
});
let jwksPromise, jwksExpires=0;
function base64urlBytes(input){
  const base64=input.replace(/-/g,'+').replace(/_/g,'/');
  const str=atob(base64.padEnd(Math.ceil(base64.length/4)*4,'='));
  return Uint8Array.from(str,c=>c.charCodeAt(0));
}
async function jwks(){
  if(jwksPromise && Date.now()<jwksExpires)return jwksPromise;
  jwksExpires=Date.now()+300000;
  jwksPromise=fetch(AUTH_ISSUER+'/cdn-cgi/access/certs').then(async r=>{
    if(!r.ok)throw new Error('Access public key lookup failed');
    const j=await r.json();
    if(!Array.isArray(j.keys))throw new Error('Access key list is unavailable');
    return j.keys;
  }).catch(e=>{jwksPromise=null;throw e});
  return jwksPromise;
}
async function verifyAccess(request){
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if(!token)return false;
  const sections=token.split('.');
  if(sections.length!==3)return false;
  let head,claims;
  try{
    head=JSON.parse(new TextDecoder().decode(base64urlBytes(sections[0])));
    claims=JSON.parse(new TextDecoder().decode(base64urlBytes(sections[1])));
  }catch{return false}
  if(head.alg!=='RS256'||!head.kid||claims.iss?.replace(/\/$/,'')!==AUTH_ISSUER)return false;
  if(!Array.isArray(claims.aud)||!claims.aud.includes(AUTH_AUDIENCE))return false;
  if(typeof claims.exp!=='number'||claims.exp<=Date.now()/1000)return false;
  if(!ALLOWED_EMAILS.has(String(claims.email||'').toLowerCase()))return false;
  const keys=await jwks();
  const match=keys.find(k=>k.kid===head.kid);
  if(!match)return false;
  const key=await crypto.subtle.importKey('jwk',match,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,base64urlBytes(sections[2]),new TextEncoder().encode(sections[0]+'.'+sections[1]));
}
function guardedHeaders(extra={}){
  return {'X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin',...extra};
}
function parseRange(header,length){
  if(!header)return {start:0,end:length-1,status:200};
  const m=/^bytes=(\d*)-(\d*)$/.exec(header);
  if(!m||(!m[1]&&!m[2]))return null;
  let start,end;
  if(!m[1]){
    const suffix=Number(m[2]);
    if(!Number.isFinite(suffix)||suffix<=0)return null;
    start=Math.max(0,length-suffix);end=length-1;
  }else{
    start=Number(m[1]);end=m[2]?Number(m[2]):length-1;
  }
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=length||end<start)return null;
  return {start,end:Math.min(end,length-1),status:206};
}
async function modelResponse(request,bucket,model){
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:guardedHeaders({'Allow':'GET, HEAD'})});
  const range=parseRange(request.headers.get('Range'),model.bytes);
  if(!range)return new Response('Invalid range',{status:416,headers:guardedHeaders({'Content-Range':'bytes */'+model.bytes})});
  const etag='"'+model.sha256+'"';
  const headers=guardedHeaders({
    'Content-Type':'application/octet-stream',
    'Content-Disposition':'inline',
    'Content-Length':String(range.end-range.start+1),
    'Accept-Ranges':'bytes',
    'ETag':etag,
    'Cache-Control':'private, max-age=3600, immutable'
  });
  if(range.status===206)headers['Content-Range']='bytes '+range.start+'-'+range.end+'/'+model.bytes;
  if(request.method==='HEAD')return new Response(null,{status:range.status,headers});
  if(range.status===200&&request.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers:guardedHeaders({'ETag':etag})});
  let position=range.start;
  let reader=null;
  const stream=new ReadableStream({
    async pull(controller){
      try{
        for(;;){
          if(reader){
            const result=await reader.read();
            if(!result.done){controller.enqueue(result.value);return}
            reader=null;
          }
          if(position>range.end){controller.close();return}
          const index=Math.floor(position/PART_SIZE);
          if(index>=model.count)throw new Error('Model chunk count exceeded');
          const offset=position%PART_SIZE;
          const count=Math.min(PART_SIZE-offset,range.end-position+1);
          const id=MODEL_PREFIX+model.key+'/'+String(index).padStart(3,'0');
          const object=await bucket.get(id,{range:{offset,length:count}});
          if(!object||!object.body)throw new Error('Missing private model chunk '+id);
          reader=object.body.getReader();
          position+=count;
        }
      }catch(err){controller.error(err)}
    },
    cancel(reason){if(reader)reader.cancel(reason).catch(()=>{})}
  });
  return new Response(stream,{status:range.status,headers});
}
export default {
  async fetch(request,env){
    const u=new URL(request.url);
    if(!['GET','HEAD'].includes(request.method)){
      return new Response('Method not allowed',{status:405,headers:guardedHeaders({'Allow':'GET, HEAD'})});
    }
    try{
      if(!(await verifyAccess(request))){
        return new Response('This Circle preview requires founder sign-in through Cloudflare Access.',{status:403,headers:guardedHeaders({'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'})});
      }
    }catch{
      return new Response('Preview authorization is temporarily unavailable.',{status:503,headers:guardedHeaders({'Cache-Control':'no-store'})});
    }
    if(u.pathname==='/'||u.pathname==='/immersive'){
      return Response.redirect(u.origin+'/immersive/',302);
    }
    if(u.pathname==='/__review/health'){
      const keys=await Promise.all(Object.values(MODELS).map(async m=>{
        const first=await env.CIRCLE_MODELS.head(MODEL_PREFIX+m.key+'/000');
        const last=await env.CIRCLE_MODELS.head(MODEL_PREFIX+m.key+'/'+String(m.count-1).padStart(3,'0'));
        return {name:m.key,expectedBytes:m.bytes,chunks:m.count,first:!!first,last:!!last};
      }));
      return Response.json({status:'private-preview',checkpoint:'S01-R2',models:keys},{headers:guardedHeaders({'Cache-Control':'no-store'})});
    }
    if(u.pathname.startsWith('/immersive/splats/')){
      const file=u.pathname.slice('/immersive/splats/'.length);
      if(!Object.hasOwn(MODELS,file))return new Response('Not found',{status:404,headers:guardedHeaders()});
      return modelResponse(request,env.CIRCLE_MODELS,MODELS[file]);
    }
    // Preserve the exact approved S01 GitHub/Pages build; do not rebuild it as a photo landing page.
    const upstream=new URL(u.pathname+u.search,SOURCE_ORIGIN);
    const result=await fetch(upstream.toString(),{method:request.method,headers:{'Accept':request.headers.get('Accept')||'*/*'},redirect:'manual'});
    const headers=new Headers(result.headers);
    headers.delete('set-cookie');
    headers.set('X-Robots-Tag','noindex, nofollow');
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Referrer-Policy','no-referrer');
    headers.set('Cache-Control','private, max-age=300');
    return new Response(result.body,{status:result.status,headers});
  }
};
