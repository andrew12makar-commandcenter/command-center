// A Google Maps search URL is NOT an exact business listing, even if Google
// shows one apparent result. A listing-specific ID still does not verify the
// name, address, phone number, or who manages the profile.
export type GoogleListingLinkKind='none'|'specific_id'|'search'|'unverified_link'|'invalid';
export type GoogleListingLink={kind:GoogleListingLinkKind;url:string|null};

export function classifyGoogleListingLink(value:string|null|undefined):GoogleListingLink{
 const raw=(value||'').trim();
 if(!raw)return {kind:'none',url:null};
 try{
  const u=new URL(raw);
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return {kind:'invalid',url:null};
  const host=u.hostname.toLowerCase().replace(/\.$/,'');
  if(host==='maps.app.goo.gl'||host==='g.page')return {kind:'unverified_link',url:u.toString()};
  if(!['google.com','www.google.com','maps.google.com'].includes(host))return {kind:'invalid',url:null};
  const path=u.pathname.toLowerCase();
  const cid=u.searchParams.get('cid')||u.searchParams.get('ludocid');
  const placeId=u.searchParams.get('query_place_id')||u.searchParams.get('place_id');
  if((cid&&/^\d{1,24}$/.test(cid))||(placeId&&/^ChI[A-Za-z0-9_-]{8,}$/.test(placeId)))
   return {kind:'specific_id',url:u.toString()};
  // Google /maps/place paths are human-friendly but not guaranteed unique.
  if(/\/maps\/search(?:\/|$)/.test(path)||u.searchParams.has('query')||u.searchParams.has('q'))
   return {kind:'search',url:u.toString()};
  return {kind:'unverified_link',url:u.toString()};
 }catch{return {kind:'invalid',url:null};}
}

// Staged imports only promote listing-specific references into CRM google_business_url.
// Search and shortened links remain available in the staged source/review evidence
// for manual resolution, but must not silently become a recorded listing.
export function exactGoogleListingUrl(value:string|null|undefined):string|null{
 const link=classifyGoogleListingLink(value);
 return link.kind==='specific_id'?link.url:null;
}
