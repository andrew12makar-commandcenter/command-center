import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireWorkspace} from '@/lib/workspace';
import {currentAudit,type AuditRecord,type OpportunityBusiness} from '@/lib/opportunity-board';
import {buildSalesBrief} from '@/lib/sales-brief';
import type {AuditFindings} from '@/lib/website-intelligence';

type Params={id:string};
export default async function ProspectBrief({params}:{params:Promise<Params>}){
 const {id}=await params;
 const {supabase,organizationId}=await requireWorkspace();
 const [{data:business,error},{data:audits},{data:demos}]=await Promise.all([
  supabase.from('businesses')
   .select('id,name,category,city,service_area,website_url,verification_status,operational_status,pipeline_status,priority_score,phone,contact_email')
   .eq('organization_id',organizationId).eq('id',id).maybeSingle(),
  supabase.from('website_assessments')
   .select('business_id,website_url,status,assessed_at,findings')
   .eq('organization_id',organizationId).eq('business_id',id)
   .order('assessed_at',{ascending:false}).limit(25),
  supabase.from('demo_sites').select('id,template,created_at,status')
   .eq('organization_id',organizationId).eq('business_id',id)
   .order('created_at',{ascending:false}).limit(1)
 ]);
 if(error||!business)notFound();
 const selected=currentAudit(business as OpportunityBusiness,(audits??[]) as AuditRecord[]);
 const brief=buildSalesBrief(business.name,selected?
  {status:selected.status,website_url:selected.website_url,assessed_at:selected.assessed_at,
    findings:selected.findings as Partial<AuditFindings>} :null);
 const latestDemo=demos?.[0];
 const unverified=business.verification_status!=='verified'||business.operational_status!=='operating';
 return <main className="max-w-6xl">
  <Link className="muted text-sm" href={'/app/leads/'+id}>← {business.name} · CRM</Link>
  <div className="mt-7 flex flex-wrap justify-between gap-5">
   <div>
    <p className="kicker">Internal only · evidence-led sales workup</p>
    <h1 className="mt-3 text-3xl font-semibold">{business.name}: Website Opportunity Brief</h1>
    <p className="muted mt-3">Research and demo production instructions. Not a customer-approved proposal or performance guarantee.</p>
   </div>
   <div className="flex items-center gap-3">
    <Link className="btn" href={'/app/intelligence?business='+id}>Website Intelligence ↗</Link>
    {latestDemo&&<Link className="btn" href={'/app/demos/'+latestDemo.id}>Latest demo ↗</Link>}
   </div>
  </div>
  <section className="panel mt-8 p-6">
   <p className="kicker">Evidence status</p>
   <div className="mt-4 grid gap-4 md:grid-cols-3">
    <div><p className="muted text-sm">Measurement confidence</p><p className="mt-2 text-lg font-semibold capitalize">{brief.confidence.replaceAll('_',' ')}</p></div>
    <div><p className="muted text-sm">Assessment source</p><p className="mt-2 text-lg font-semibold">{brief.sourceLabel}</p></div>
    <div><p className="muted text-sm">Measured</p><p className="mt-2 text-lg font-semibold">{brief.assessedAt?new Date(brief.assessedAt).toLocaleDateString('en-US'):'Not measured'}</p></div>
   </div>
   {unverified&&<p role="status" className="mt-5 border-t border-[#344954] pt-4 text-sm text-amber-200">The business is not fully verified as operating in the CRM. Confirm its identity and status before outreach.</p>}
  </section>
  <section className="mt-6 grid gap-5 md:grid-cols-2">
   <div className="panel p-6">
    <p className="kicker">Existing website · mobile lab</p>
    <h2 className="mt-3 text-2xl font-semibold">{brief.originalPerformance!==null?brief.originalPerformance+'/100':'Not measured'}</h2>
    <p className="muted mt-2 text-sm">Lighthouse performance, {brief.confidence==='inconclusive'?'provisional / unreliable':brief.sourceLabel.toLowerCase()}</p>
    <p className="mt-4 text-sm">Largest Contentful Paint: <strong>{brief.originalLcpMs!==null?(brief.originalLcpMs/1000).toFixed(1)+' seconds':'Not measured'}</strong></p>
    <p className="muted mt-3 break-all text-xs">{business.website_url||'No independently identified website'}</p>
   </div>
   <div className="panel p-6">
    <p className="kicker">Proposed demo · mobile lab</p>
    <h2 className="mt-3 text-2xl font-semibold">Not benchmarked</h2>
    <p className="muted mt-2 text-sm">No verified demo comparison exists.</p>
    <p className="mt-4 text-sm">Measured speed improvement: <strong>Unknown</strong></p>
    <p className="muted mt-3 text-xs">Build the draft, deploy an approved test URL, and measure under comparable settings before claiming results.</p>
   </div>
  </section>
  <section className="panel mt-6 p-6">
   <p className="kicker">Traceable diagnostic signals</p>
   <h2 className="mt-2 text-xl font-semibold">What the report actually measured</h2>
   {brief.observations.length>0?
    <div className="mt-5 grid gap-3 md:grid-cols-2">{brief.observations.map(x=>
     <div className="rounded-xl border border-[#2b4350] p-4" key={x.label}>
      <p className="muted text-sm">{x.label}</p><strong className="mt-2 block text-xl">{x.value}</strong>
      <small className="muted mt-2 block">{x.kind==='estimated'?'Lighthouse estimated opportunity, not guaranteed savings':'Lab observation from the saved assessment'}</small>
     </div>)}</div>:
    <p className="muted mt-4">No applicable measurements were saved. Audit this company&apos;s actual website before preparing quantitative claims.</p>}
  </section>
  <section className="panel mt-6 p-6">
   <p className="kicker">Demo build priorities</p>
   <h2 className="mt-2 text-xl font-semibold">Improve the experience, then test the result</h2>
   <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6">{brief.designGoals.map((goal,i)=><li key={i}>{goal}</li>)}</ol>
   {latestDemo?<p className="mt-5 text-sm text-cyan-200">Internal demo recorded: <Link className="underline" href={'/app/demos/'+latestDemo.id}>Open {latestDemo.template} draft ↗</Link></p>:
    <p className="muted mt-5 text-sm">No demo exists yet. Generate the industry-matched design from this business&apos;s CRM record.</p>}
  </section>
  <section className="panel mt-6 p-6">
   <p className="kicker">Commercial approach · draft positioning</p>
   <h2 className="mt-2 text-xl font-semibold">Performance-led website refresh</h2>
   <p className="mt-4 text-sm leading-7">Offer a short, evidence-backed mobile website review followed by an optional redesigned concept. Only propose implementation once the business owner confirms needs, content rights and contact/appointment requirements. Any maintenance plan is scoped and priced separately.</p>
   {brief.outreachSummary?<p className="mt-4 text-sm text-cyan-100">{brief.outreachSummary}</p>:
    <p className="mt-4 text-sm text-amber-200">No performance-based outreach claim is cleared from the current saved evidence. Continue research before making numerical claims.</p>}
   <p className="muted mt-4 text-xs">No emails, calls or proposals are sent automatically by this page. External sharing requires manual review and business consent.</p>
  </section>
  <section className="panel mt-6 p-6">
   <p className="kicker">Evidence limitations</p>
   <h2 className="mt-2 text-xl font-semibold">Claims we cannot make yet</h2>
   <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#bdd1db]">{brief.cautions.map(x=><li key={x}>{x}</li>)}</ul>
  </section>
 </main>;
}
