import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import {requireWorkspace} from '@/lib/workspace';
import type {GovernmentCandidate} from '@/lib/government-discovery.ts';
import {findCoveredGovernmentReview, type GovernmentLocationReview} from '@/lib/government-location-review';
import {matchGovernmentEvidence,needsFoodPermitStatusCheck} from '@/lib/overture-government-match';
import {triageDiscoveryCandidate} from '@/lib/candidate-triage';
import {readGovernmentLocationReviews} from '../government-map/records';
import PublicEvidenceCard from './evidence-card';

export const dynamic='force-dynamic';

type Place={
 name:string;category:string|null;distanceMiles:number|null;street:string|null;city:string|null;postcode:string|null;
 website:string|null;unverifiedWebsiteUrls:string[];thirdPartyUrls:string[];flags:string[];phone:string|null;
 email:string|null;
 operatingStatus:string|null;confidence:number|null;sourceUpdated:string|null;sourceUrl:string|null;release:string|null;
};
type Dataset={release:string;createdAt:string;candidates:Place[]};
type Filter='all'|'recorded'|'needs_review'|'not_recorded';
type PermitFilter='all'|'matched'|'name_variant'|'address_only'|'unmatched'|'food_review';
type ReviewSort='nearest'|'research_first';

async function loadGovernmentDataset():Promise<{createdAt:string;candidates:GovernmentCandidate[]}|null>{
 const root=path.join(process.cwd(),'.local-discovery','government');
 try{
  const files=(await readdir(root)).filter(x=>x.endsWith('.json'));
  const snapshots:{createdAt:string;candidates:GovernmentCandidate[]}[]=[];
  for(const file of files){try{
   const parsed=JSON.parse(await readFile(path.join(root,file),'utf8')) as {created_at?:unknown;candidates?:unknown};
   if(!Array.isArray(parsed.candidates))continue;
   snapshots.push({createdAt:typeof parsed.created_at==='string'?parsed.created_at:'',candidates:parsed.candidates as GovernmentCandidate[]});
  }catch{/* Skip incomplete local downloads. */}}
  snapshots.sort((a,b)=>Date.parse(b.createdAt||'')-Date.parse(a.createdAt||''));
  return snapshots[0]||null;
 }catch{return null;}
}

async function loadDataset():Promise<Dataset|null>{
 const root=path.join(process.cwd(),'.local-discovery');
 try{
  const dirs=(await readdir(root,{withFileTypes:true})).filter(x=>x.isDirectory()&&x.name.startsWith('overture-')).map(x=>x.name);
  const snapshots:Dataset[]=[];
  for(const dir of dirs){
   try{
    const parsed=JSON.parse(await readFile(path.join(root,dir,'candidates.json'),'utf8')) as {release?:unknown;createdAt?:unknown;candidates?:unknown};
    if(!Array.isArray(parsed.candidates))continue;
    const candidates=parsed.candidates.filter((x):x is Place=>Boolean(x&&typeof x==='object'&&typeof (x as Place).name==='string'));
    snapshots.push({release:typeof parsed.release==='string'?parsed.release:dir,createdAt:typeof parsed.createdAt==='string'?parsed.createdAt:'',candidates});
   }catch{/* Try the next locally cached review file. */}
  }
  snapshots.sort((a,b)=>Date.parse(b.createdAt||'')-Date.parse(a.createdAt||''));
  if(snapshots.length)return snapshots[0];
 }catch{/* A local snapshot is optional; show a clear empty state. */}
 return null;
}
function safeHref(raw:string|null|undefined):string|null{
 try{const url=new URL(raw||'');return url.protocol==='https:'||url.protocol==='http:'?url.toString():null;}catch{return null;}
}
const hasSuspect=(x:Place)=>Array.isArray(x.unverifiedWebsiteUrls)&&x.unverifiedWebsiteUrls.length>0;
const hasWebsite=(x:Place)=>Boolean(safeHref(x.website));
function miles(x:Place){return typeof x.distanceMiles==='number'&&Number.isFinite(x.distanceMiles)?x.distanceMiles:null;}

export default async function OvertureReview({searchParams}:{searchParams:Promise<{q?:string;site?:string;permit?:string;sort?:string;page?:string;covered?:string}>}){
 await requireWorkspace();
 const p=await searchParams,[dataset,government,reviews]=await Promise.all([loadDataset(),loadGovernmentDataset(),readGovernmentLocationReviews()]);
 const q=(p.q||'').trim().slice(0,100);
 const site=(['recorded','needs_review','not_recorded'].includes(p.site||'')?p.site:'all') as Filter;
 const permit=(['matched','name_variant','address_only','unmatched','food_review'].includes(p.permit||'')?p.permit:'all') as PermitFilter;
 const sort=(p.sort==='research_first'?'research_first':'nearest') as ReviewSort;
 const showCovered=p.covered==='1';
 const search=q.toLocaleLowerCase();
 const all=dataset?.candidates||[];
 const coveredReview=(x:Place):GovernmentLocationReview|null=>government?findCoveredGovernmentReview({name:x.name,address:x.street,zip:x.postcode},government.candidates,reviews):null;
 const coveredCount=all.filter(x=>coveredReview(x)!==null).length;
 const evidence=new Map(all.map(x=>[x,government?matchGovernmentEvidence(x,government.candidates):{exactMatches:[],possibleNameVariants:[],otherNamesAtAddress:[]}]));
 const filtered=all.filter(x=>{
  if(!showCovered&&coveredReview(x))return false;
  if(showCovered&&!coveredReview(x))return false;
  const text=[x.name,x.category,x.street,x.city,x.postcode].filter(Boolean).join(' ').toLocaleLowerCase();
  if(search&&!text.includes(search))return false;
  if(site==='recorded'&&!hasWebsite(x))return false;
  if(site==='needs_review'&&!hasSuspect(x))return false;
  if(site==='not_recorded'&&hasWebsite(x))return false;
  const match=evidence.get(x);
  if(permit==='matched'&&!match?.exactMatches.length)return false;
  if(permit==='name_variant'&&!match?.possibleNameVariants.length)return false;
  if(permit==='address_only'&&(match?.exactMatches.length||(!match?.possibleNameVariants.length&&!match?.otherNamesAtAddress.length)))return false;
  if(permit==='unmatched'&&(match?.exactMatches.length||match?.possibleNameVariants.length||match?.otherNamesAtAddress.length))return false;
  if(permit==='food_review'&&(!government||!needsFoodPermitStatusCheck(x,match!)))return false;
  return true;
 }).sort((a,b)=>{
  if(sort==='research_first'){
   const priority={review_first:0,research_later:1,lower_priority:2} as const;
   const byResearch=priority[triageDiscoveryCandidate(a).band]-priority[triageDiscoveryCandidate(b).band];
   if(byResearch)return byResearch;
  }
  return (miles(a)??Infinity)-(miles(b)??Infinity)||a.name.localeCompare(b.name);
 });
 const pageSize=40,pages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const requested=Number.parseInt(p.page||'1',10),page=Number.isFinite(requested)?Math.min(pages,Math.max(1,requested)):1;
 const shown=filtered.slice((page-1)*pageSize,page*pageSize);
 const recorded=all.filter(hasWebsite).length,suspect=all.filter(hasSuspect).length,noSite=all.length-recorded-suspect,noAccepted=all.filter(x=>!hasWebsite(x)).length;
 const href=(next:number)=>{
  const params=new URLSearchParams();if(q)params.set('q',q);if(site!=='all')params.set('site',site);if(permit!=='all')params.set('permit',permit);if(sort!=='nearest')params.set('sort',sort);if(next>1)params.set('page',String(next));
  if(showCovered)params.set('covered','1');
  return '/app/discovery/overture'+(params.size?'?'+params.toString():'');
 };
 return <main className="max-w-7xl space-y-6">
  <div className="flex flex-wrap items-end justify-between gap-4">
   <div><p className="kicker">Free local map data · read only</p><h1 className="mt-3 text-4xl font-semibold">Overture candidate review</h1>
    <p className="muted mt-3 max-w-3xl text-sm leading-6">Browse the local Brighton map sample by distance or research order. These are research candidates, not verified businesses or sales leads. Locations with an exact, evidence-backed strong presence are marked X on the government map and removed from this default list. Nothing on this page writes to CRM.</p></div>
   <Link className="btn" href="/app/discovery">← Prospect Discovery</Link>
  </div>
  {!dataset?<section className="panel p-6"><h2 className="text-lg font-semibold">No local Overture review file found</h2><p className="muted mt-2 text-sm">Download and review a Brighton snapshot with <code>npm run discover:overture -- --areas brighton</code>. This uses the free Overture map release; it does not call a paid API.</p></section>:<>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
    {[["Candidates",all.length],["Accepted website URLs",recorded],["Possible site mismatches",suspect],["No accepted website URL",noAccepted],["Exact Boston city record matches",all.filter(x=>evidence.get(x)?.exactMatches.length).length],["Possible city-record name variations",all.filter(x=>evidence.get(x)?.possibleNameVariants.length).length],["Food records needing a current-status check",government?all.filter(x=>needsFoodPermitStatusCheck(x,evidence.get(x)!)).length:'—']].map(([label,value])=><section className="panel p-5" key={label}><p className="muted text-sm">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></section>)}
   </div>
   <section className="panel p-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="kicker">Local snapshot · Overture {dataset.release}</p><p className="muted mt-2 text-xs">{noAccepted} rows have no accepted first-party website URL. Of these, {suspect} have a possible URL mismatch and {noSite} have no accepted or suspect URL. Missing data is a research clue, not a confirmed website gap.</p></div>
     <div className="flex flex-wrap items-center gap-3"><Link className="text-xs text-cyan-300 underline" href={showCovered?'/app/discovery/overture':'/app/discovery/overture?covered=1'}>{showCovered?'Show available candidates':'Show X-marked removed'} ({showCovered?all.length-coveredCount:coveredCount})</Link><Link className="text-xs text-cyan-300 underline" href="/app/discovery/government-map">Open government map ↗</Link><span className="muted text-xs">Sorted by approximate straight-line distance from Brighton Center · {filtered.length} matching</span></div></div>
    <form action="/app/discovery/overture" method="get" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_210px_220px_230px_auto]">
     {showCovered&&<input type="hidden" name="covered" value="1"/>}
     <label className="text-xs">Search name, category or address<input className="mt-1" name="q" defaultValue={q} placeholder="e.g., salon, plumber, Brighton" maxLength={100}/></label>
     <label className="text-xs">Website evidence<select className="mt-1" name="site" defaultValue={site}>
      <option value="all">All evidence states</option><option value="recorded">Accepted URL recorded</option><option value="needs_review">Possible URL mismatch</option><option value="not_recorded">No accepted URL in source</option>
     </select></label>
     <label className="text-xs">Boston city record<select className="mt-1" name="permit" defaultValue={permit}>
      <option value="all">All city record states</option><option value="matched">Exact name and street match</option><option value="name_variant">Possible name variation</option><option value="address_only">Other city names at same street number</option><option value="unmatched">No match in downloaded records</option><option value="food_review">Food record needs current-status check</option>
     </select></label>
     <label className="text-xs">Review order<select className="mt-1" name="sort" defaultValue={sort}>
      <option value="nearest">Nearest first</option><option value="research_first">Research first</option>
     </select></label>
     <div className="flex items-end gap-3"><button type="submit" className="btn">Filter</button><Link href="/app/discovery/overture" className="muted pb-2 text-xs underline">Clear</Link></div>
    </form>
    {sort==='research_first'&&<p className="mt-4 rounded-lg border border-[#42626c] bg-[#112832] p-3 text-xs leading-5 text-[#bad2d9]">Research first highlights likely local customer businesses with a listed phone or email and no accepted website URL in this map source. The source can miss real websites, so verify each business and website before treating it as an opportunity. This order is not a sales score or qualification.</p>}
    <div className="mt-5 overflow-x-auto"><table><thead><tr><th>Business / distance</th><th>Research order</th><th>Location</th><th>Online presence recorded</th><th>Boston record evidence</th><th>Map source clues</th><th>Public evidence review</th></tr></thead>
     <tbody>{shown.map((x,i)=>{
      const distance=miles(x),website=safeHref(x.website),suspects=(x.unverifiedWebsiteUrls||[]).map(safeHref).filter((u):u is string=>Boolean(u));
      const third=(x.thirdPartyUrls||[]).map(safeHref).filter((u):u is string=>Boolean(u));
      const matched=evidence.get(x);
      const triage=triageDiscoveryCandidate(x);
      const bandLabel=triage.band==='review_first'?'Review first':triage.band==='research_later'?'Research later':'Lower priority';
      return <tr key={x.name+'-'+(x.street||'')+'-'+i}>
       <td className="min-w-56"><strong>{x.name}</strong>{showCovered&&<span className="ml-2 rounded border border-rose-500/60 px-1.5 py-0.5 text-[10px] text-rose-200">X · already covered</span>}<span className="muted mt-1 block text-xs">{x.category||'Category not recorded'} · {distance===null?'Distance unavailable':distance.toFixed(2)+' mi'}</span></td>
       <td className="min-w-56 text-xs"><strong className={triage.band==='review_first'?'text-cyan-200':triage.band==='lower_priority'?'text-amber-200':'text-[#c3d3d9]'}>{bandLabel}</strong><span className="muted mt-1 block">{triage.siteEvidence.replaceAll('_',' ')} · {triage.hasContactPath?'contact listed':'no contact listed'}</span>{triage.reasons.length>1&&<span className="muted mt-1 block">{triage.reasons[1]}</span>}</td>
       <td className="min-w-48 text-xs">{[x.street,x.city,x.postcode].filter(Boolean).join(', ')||'Address not recorded'}<span className="muted mt-1 block capitalize">Source status: {x.operatingStatus||'not reported'}</span></td>
       <td className="min-w-52 text-xs">
        {website&&<a className="block text-cyan-300 underline" href={website} target="_blank" rel="noreferrer">URL in source ↗</a>}
        {suspects.map((u,n)=><a className="block text-amber-200 underline" key={u+n} href={u} target="_blank" rel="noreferrer">Possible name mismatch · review only ↗</a>)}
        {third.map((u,n)=><a className="block text-cyan-100 underline" key={u+n} href={u} target="_blank" rel="noreferrer">Third-party link, not business site ↗</a>)}
        {!website&&!suspects.length&&!third.length&&<span className="muted">No URL accepted from this source</span>}
       </td>
       <td className="min-w-60 text-xs">
        {government&&needsFoodPermitStatusCheck(x,matched!)&&<div className="mb-2"><span className="text-amber-200">No exact name match in the active food-establishment file</span><span className="muted mt-1 block">Verify the current operator and address before treating this map entry as covered. A possible name variation or a different former business at the address may explain the difference.</span><a className="mt-1 block text-cyan-300 underline" href="https://data.boston.gov/dataset/active-food-establishment-licenses" target="_blank" rel="noreferrer">Official food permit source ↗</a></div>}
        {matched?.exactMatches.map((record)=><div key={record.candidate_id} className="mb-2"><span className="text-emerald-200">Exact name and street match</span><span className="muted mt-1 block">{record.license_status||'Status not supplied'} · {record.source_title}</span><a className="mt-1 block text-cyan-300 underline" href={record.source_url} target="_blank" rel="noreferrer">Official city dataset ↗</a></div>)}
        {matched?.possibleNameVariants.map((record)=><div key={record.candidate_id} className="mb-2"><span className="text-amber-200">Possible name variation · review before matching</span><span className="muted mt-1 block">City record: {record.name} · {record.license_status||'status not supplied'} · {record.source_title}. A distinctive name overlaps at this street number; this is a research clue, not a confirmed identity match.</span><a className="mt-1 block text-cyan-300 underline" href={record.source_url} target="_blank" rel="noreferrer">Official city dataset ↗</a></div>)}
        {!matched?.exactMatches.length&&matched?.otherNamesAtAddress.map((record)=><div key={record.candidate_id} className="mb-2"><span className="text-amber-200">Other city record at this street number</span><span className="muted mt-1 block">City record: {record.name} · {record.source_title}. City data may omit suites; this could be a different suite or a former business.</span></div>)}
        {!matched?.exactMatches.length&&!matched?.possibleNameVariants.length&&!matched?.otherNamesAtAddress.length&&<span className="muted">No name/address match in the downloaded city files{government?'. This does not mean unlicensed or closed.':'. Download the local permit snapshot to compare.'}</span>}
       </td>
       <td className="min-w-48 text-xs"><span>{(x.flags||[]).join(' · ')||'No review flag'}</span>{x.confidence!==null&&x.confidence!==undefined&&<span className="muted mt-1 block">Source confidence {(x.confidence*100).toFixed(0)}%</span>}</td>
       <td className="min-w-72 align-top"><PublicEvidenceCard candidate={{name:x.name,street:x.street,city:x.city,postcode:x.postcode,phone:x.phone,website:x.website,sourceUrl:x.sourceUrl}}/></td>
      </tr>;
     })}</tbody></table></div>
    {!shown.length&&<p className="muted mt-5 text-sm">No local candidates match this filter.</p>}
    {pages>1&&<nav className="mt-5 flex justify-end gap-4 text-sm" aria-label="Candidate pages">{page>1&&<Link className="text-cyan-300 underline" href={href(page-1)}>← Previous</Link>}<span className="muted">Page {page} of {pages}</span>{page<pages&&<Link className="text-cyan-300 underline" href={href(page+1)}>Next →</Link>}</nav>}
   </section>
  </>}
  <p className="muted text-xs">Source release: {dataset?.release||'not loaded'}. Boston files downloaded {government?.createdAt?new Date(government.createdAt).toLocaleString('en-US'):'not available'}. Exact city records are matched by normalized business name and street number/street. Distinctive name variations appear only as research clues, never identity matches. Other different-name records remain separate. City files may omit suites and are not a full business registry. Source dates are not live checks. Import is intentionally separate. Verify identity, operation, exact Google listing and current website before outreach.</p>
 </main>;
}
