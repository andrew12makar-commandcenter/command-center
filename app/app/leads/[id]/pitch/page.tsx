import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireWorkspace} from '@/lib/workspace';
import type {AuditRecord} from '@/lib/opportunity-board';
import {buildSalesBrief} from '@/lib/sales-brief';
import type {AuditFindings} from '@/lib/website-intelligence';
import {qualifyCrmBusiness,readCampaign} from '@/lib/business-qualification-server';
import {buildPitchBrief} from '@/lib/pitch-brief';
import PitchBriefActions from '@/components/pitch-brief-actions';

function Section({title,children}:{title:string;children:React.ReactNode}){
 return <section className="panel mt-5 break-inside-avoid p-6">
  <h2 className="kicker">{title}</h2><div className="mt-3 text-sm leading-6">{children}</div></section>;
}
function List({items}:{items:string[]}){
 return <ul className="list-disc space-y-1 pl-5">{items.map(x=><li key={x}>{x}</li>)}</ul>;
}
export default async function PitchBriefPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,organizationId}=await requireWorkspace();
 const {data:b,error}=await supabase.from('businesses').select('*').eq('organization_id',organizationId).eq('id',id).maybeSingle();
 if(error||!b)notFound();
 const [{data:audits},{data:sources},{data:demos},campaign]=await Promise.all([
  supabase.from('website_assessments').select('business_id,website_url,status,assessed_at,findings')
   .eq('organization_id',organizationId).eq('business_id',id).order('assessed_at',{ascending:false}).limit(25),
  supabase.from('business_sources').select('business_id,source_url,source_type,confidence,agency')
   .eq('organization_id',organizationId).eq('business_id',id).order('recorded_at',{ascending:true}),
  supabase.from('demo_sites').select('id,template,status').eq('organization_id',organizationId).eq('business_id',id)
   .order('created_at',{ascending:false}).limit(1),
  readCampaign(supabase,organizationId,b.campaign_id)
 ]);
 const {q,audit}=qualifyCrmBusiness(b,(audits??[]) as AuditRecord[],sources??[],campaign);
 const sales=buildSalesBrief(b.name,audit?{status:audit.status,website_url:audit.website_url,assessed_at:audit.assessed_at,
  findings:audit.findings as Partial<AuditFindings>}:null);
 const demo=demos?.[0];
 const brief=buildPitchBrief({business:b,campaign,q,sales,auditUrl:audit?.website_url??null,
  sources:(sources??[]).map(s=>({url:s.source_url||'',label:(s.source_type==='social_profile'?'Social / directory profile':s.agency||s.source_type||'Source')+(s.confidence==='matched'?' (matched)':'')})),
  demoUrl:demo?'/app/demos/'+demo.id:null,generatedAt:new Date().toISOString()});
 return <main className="pitch-brief max-w-4xl">
  <Link className="no-print muted text-sm" href={'/app/leads/'+id}>← {b.name} · CRM</Link>
  <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
   <div><p className="kicker">Internal pitch brief · not for sending</p><h1 className="mt-2 text-3xl font-semibold">{b.name}</h1>
    <p className="muted mt-2 text-sm">{brief.location}</p><p className="muted text-sm">{b.category||'Category not recorded'}</p></div>
   <PitchBriefActions markdown={brief.markdown}/>
  </div>
  <section className="panel mt-6 grid gap-4 p-6 text-sm sm:grid-cols-2">
   <div><p className="muted text-xs">Campaign</p><p className="mt-1 font-semibold">{brief.campaign}</p></div>
   <div><p className="muted text-xs">Primary opportunity</p><p className="mt-1 font-semibold">{brief.opportunity}</p></div>
   <div><p className="muted text-xs">Evidence confidence</p><p className="mt-1 font-semibold">{brief.confidence}</p></div>
   <div><p className="muted text-xs">Recommended next action</p><p className="mt-1 font-semibold">{brief.nextAction}</p></div>
  </section>
  <Section title="Recommended opening offer"><p>{brief.openingOffer}</p></Section>
  <Section title="Supporting evidence"><List items={brief.evidence}/></Section>
  <Section title="Important unknowns"><List items={brief.unknowns}/></Section>
  <Section title="Website audit summary"><List items={brief.auditSummary}/></Section>
  <Section title="Existing website, GBP and demo">
   {brief.links.length?<ul className="space-y-1">{brief.links.map(l=><li key={l.url}>{l.label}: <a className="break-all text-cyan-300 underline" href={l.url} target="_blank" rel="noopener noreferrer">{l.url}</a></li>)}</ul>:<p>No website or GBP link recorded.</p>}
   <p className="mt-2">{demo?<>Internal demo draft: <Link className="text-cyan-300 underline" href={'/app/demos/'+demo.id}>{demo.template} · {demo.status}</Link> (not shared publicly)</>:
    <>No demo yet. <Link className="no-print text-cyan-300 underline" href={'/app/leads/'+id+'#website-demo'}>Generate one with the existing demo generator →</Link></>}</p>
  </Section>
  <Section title="Claims that must not be made"><List items={brief.doNotClaim}/></Section>
  <Section title="Sources">{brief.sources.length?<ul className="space-y-1">{brief.sources.map(s=><li key={s.url}>{s.label}: <a className="break-all text-cyan-300 underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a></li>)}</ul>:<p>No sources recorded. Verify the business before pitching.</p>}</Section>
  <details className="no-print panel mt-5 p-6"><summary className="cursor-pointer text-sm font-semibold">Markdown for a pitch deck</summary>
   <textarea readOnly rows={18} className="mt-4 font-mono text-xs" defaultValue={brief.markdown}/></details>
 </main>;
}
