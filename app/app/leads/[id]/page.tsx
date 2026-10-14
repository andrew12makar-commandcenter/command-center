import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';
import { addActivity,addSource,confirmSource,markVerified,moveProfileFromWebsite,updateLead,updateBusinessQualification } from '../actions';
import {qualifyCrmBusiness,readCampaign,readOriginRaw} from '@/lib/business-qualification-server';
import {EvidenceChip,ProgressChip,ScoreBadge,ScoreBreakdown,Fold} from '@/components/prospect-ui';
import {isTestCampaign} from '@/lib/discovery-campaigns';
import type {AuditRecord} from '@/lib/opportunity-board';
import {targetServiceLabels} from '@/lib/discovery-campaigns';
import {OPPORTUNITIES,CONFIDENCES,NEXT_ACTIONS,opportunityLabels,strengthLabels,confidenceLabels,readinessLabels,nextActionLabels,websitePresenceLabels} from '@/lib/prospect-qualification';
import {classifyWebPresence} from '@/lib/web-presence';
import { createDemo } from '@/app/app/demos/actions';
import {classifyIndustry,industryLabel} from '@/lib/business-classification';

const stages=['not_contacted','contacted','visited','proposal_sent','won','lost'];
const label=(s:string)=>s.replaceAll('_',' ');

export default async function LeadDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {supabase,organizationId}=await requireWorkspace();
  const {data:b,error}=await supabase.from('businesses').select('*').eq('organization_id',organizationId).eq('id',id).maybeSingle();
  if(error||!b) notFound();
  const industry=classifyIndustry(b.name,b.category);
  const presence=classifyWebPresence(b.website_url);
  const profileOnly=presence.kind==='social'||presence.kind==='listing';
  const [{data:sources},{data:activities},{data:demos},{data:audits},campaign]=await Promise.all([
    supabase.from('business_sources').select('*').eq('organization_id',organizationId).eq('business_id',id).order('recorded_at',{ascending:false}),
    supabase.from('business_activities').select('*').eq('organization_id',organizationId).eq('business_id',id).order('occurred_at',{ascending:false}).limit(30),
    supabase.from('demo_sites').select('id,template,status,created_at').eq('organization_id',organizationId).eq('business_id',id).order('created_at',{ascending:false}),
    supabase.from('website_assessments').select('business_id,website_url,status,assessed_at,findings').eq('organization_id',organizationId).eq('business_id',id).order('assessed_at',{ascending:false}).limit(25),
    readCampaign(supabase,organizationId,b.campaign_id),
  ]);
  const origin=await readOriginRaw(supabase,organizationId,id);
  const {q}=qualifyCrmBusiness(b,(audits??[]) as AuditRecord[],sources??[],campaign,{staged:origin,hasDemo:Boolean(demos?.length)});
  const hasStoredQualification=Boolean(b.primary_opportunity||b.evidence_confidence||b.next_action);
  return <main className="max-w-6xl">
    <Link href="/app/leads" className="muted text-sm">← All prospects</Link>
    <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
      <div><p className="kicker">{b.city||'Location pending'} · {b.category||'Category pending'}</p>
      <h1 className="mt-2 text-4xl font-semibold">{b.name}</h1>
      <p className="muted mt-3">Verification: {b.verification_status} · Operational status: {b.operational_status}</p></div>
      <div className="flex gap-3">{presence.url && <a className="btn" target="_blank" rel="noopener noreferrer" href={presence.url}>{profileOnly?'Visit '+presence.provider+' profile ↗':'Visit website ↗'}</a>}
        {b.google_business_url && <a className="btn" target="_blank" rel="noreferrer" href={b.google_business_url}>Google profile ↗</a>}</div>
    </div>
    <section id="qualification" className="panel mt-7 scroll-mt-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="kicker">Prospect qualification{campaign?' · '+campaign.name:''}</p>
          <h2 className="mt-2 text-lg font-semibold">{opportunityLabels[q.primaryOpportunity]} · {strengthLabels[q.opportunityStrength]}</h2>
          <p className="muted mt-1 text-xs">{campaign?targetServiceLabels[campaign.target_service]+' campaign · '+(campaign.target_area||'any area')+(isTestCampaign(campaign)?' · TEST RECORD':''):'No discovery campaign recorded'}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2"><ScoreBadge q={q}/><ProgressChip progress={q.progress}/><EvidenceChip label="Website" state={q.websiteState}/><EvidenceChip label="GBP" state={q.gbpState}/></p></div>
        <div className="flex flex-wrap gap-3">
          <Link href={'/app/leads/'+id+'/pitch'} className="btn">Pitch brief →</Link>
          <a href="#website-demo" className="btn">Website demo ↓</a>
          <Link href="/app/opportunities" className="btn">Opportunity Board</Link>
        </div>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <div><dt className="muted text-xs">Evidence confidence</dt><dd className="mt-1 font-semibold">{confidenceLabels[q.evidenceConfidence]}</dd></div>
        <div><dt className="muted text-xs">Contact readiness</dt><dd className="mt-1 font-semibold">{readinessLabels[q.contactReadiness]}</dd></div>
        <div><dt className="muted text-xs">Next action</dt><dd className="mt-1 font-semibold">{nextActionLabels[q.nextAction]}</dd></div>
        <div><dt className="muted text-xs">Website</dt><dd className="mt-1 font-semibold">{websitePresenceLabels[q.websitePresence]}</dd></div>
        <div><dt className="muted text-xs">GBP</dt><dd className="mt-1 font-semibold">{q.gbpStatus==='recorded'?'Recorded':'Not confirmed'}</dd></div>
      </dl>
      <p className="mt-4 text-sm leading-6 text-[#c4d6dd]">{q.summary}</p>
      {b.qualification_rationale&&<p className="muted mt-1 text-xs">Recorded at import: {b.qualification_rationale}</p>}
      {q.tasks.length>0&&<p className="mt-2 text-xs"><span className="muted">Still to verify: </span>{q.tasks.join(' · ')}</p>}
      <div className="mt-3"><Fold title={'Score breakdown ('+q.score+'/100)'}><ScoreBreakdown q={q}/></Fold></div>
      {hasStoredQualification&&<p className="muted mt-1 text-xs">Opportunity, confidence and next action were recorded at import or set manually. Clear them below to recompute from current evidence.</p>}
      <details className="mt-4 border-t border-[#243745] pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-cyan-200">Update qualification</summary>
        <form action={updateBusinessQualification} className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <input type="hidden" name="business_id" value={id}/>
          <label className="text-xs">Primary opportunity<select name="primary_opportunity" className="mt-1" defaultValue={b.primary_opportunity??''}><option value="">Automatic from evidence</option>{OPPORTUNITIES.map(x=><option key={x} value={x}>{opportunityLabels[x]}</option>)}</select></label>
          <label className="text-xs">Evidence confidence<select name="evidence_confidence" className="mt-1" defaultValue={b.evidence_confidence??''}><option value="">Automatic from evidence</option>{CONFIDENCES.map(x=><option key={x} value={x}>{confidenceLabels[x]}</option>)}</select></label>
          <label className="text-xs">Next action<select name="next_action" className="mt-1" defaultValue={b.next_action??''}><option value="">Automatic from evidence</option>{NEXT_ACTIONS.map(x=><option key={x} value={x}>{nextActionLabels[x]}</option>)}</select></label>
          <label className="text-xs md:col-span-3">Rationale (evidence you checked)<textarea name="qualification_rationale" rows={2} maxLength={1200} className="mt-1" defaultValue={b.qualification_rationale??''}/></label>
          <div className="md:col-span-3"><button className="btn text-sm" type="submit">Save qualification</button><span className="muted ml-3 text-xs">Does not change the CRM priority score.</span></div>
        </form>
      </details>
    </section>
    <section className="panel mt-7 flex flex-wrap items-center justify-between gap-4 p-5">
      <div><p className="kicker">Sales opportunity brief</p><h2 className="mt-2 text-lg font-semibold">Evidence-led website refresh</h2>
      <p className="muted mt-2 text-sm">Trace measured speed issues, prioritize demo work and keep the before/after comparison unclaimed until benchmarked.</p></div>
      <Link href={'/app/leads/'+id+'/brief'} className="btn">Open opportunity brief →</Link>
    </section>
    <section className="panel mt-7 flex flex-wrap items-center justify-between gap-4 p-5">
      <div><p className="kicker">Website Intelligence</p><h2 className="mt-2 text-lg font-semibold">Inspect performance and technical SEO</h2>
      <p className="muted mt-2 text-sm">{profileOnly?'A social or directory profile is recorded, not an independent business website. Do not run PageSpeed on this link.':'Evidence-backed mobile PageSpeed results, separate from your manual sales priority.'}</p></div>
      {profileOnly?<span className="text-sm text-amber-200">Website research needed</span>:<Link href={'/app/intelligence?business='+id} className="btn">Open website audits →</Link>}
    </section>
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="panel p-7"><p className="kicker">Sales operations</p><h2 className="mt-2 text-xl font-semibold">Pipeline & next action</h2>
          <form action={updateLead} className="mt-6 grid gap-4 md:grid-cols-2"><input type="hidden" name="id" value={id}/>
            <label className="text-sm">Business industry / service category<input name="category" className="mt-2" maxLength={180} defaultValue={b.category??''} placeholder="e.g., Family medicine, landscaping, legal services"/></label>
            <label className="text-sm">Operating status<select name="operational_status" className="mt-2" defaultValue={b.operational_status}>
              <option value="unknown">Not checked</option><option value="operating">Confirmed operating</option><option value="opening">Opening soon</option><option value="closed">Closed</option>
            </select></label>
            <label className="text-sm">Pipeline status<select name="pipeline_status" className="mt-2" defaultValue={b.pipeline_status}>{stages.map(x=><option value={x} key={x}>{label(x)}</option>)}</select></label>
            <label className="text-sm">Next follow-up<input name="next_follow_up_on" className="mt-2" type="date" defaultValue={b.next_follow_up_on??''}/></label>
            <label className="text-sm">Contact name<input name="contact_name" className="mt-2" defaultValue={b.contact_name??''}/></label>
            <label className="text-sm">Contact email<input name="contact_email" type="email" className="mt-2" defaultValue={b.contact_email??''}/></label>
            <label className="text-sm">Independent business website<input name="website_url" type="url" className="mt-2" defaultValue={profileOnly?'':b.website_url??''} placeholder="https://official-business-site.com"/></label>
            <label className="text-sm">Google Business Profile link, if found<input name="google_business_url" type="url" className="mt-2" defaultValue={b.google_business_url??''} placeholder="https://maps.google.com/…"/></label>
            <p className="muted text-xs md:col-span-2">Website field is for independent business sites only. Instagram, Facebook, and Google listings are separate research evidence. An unrecorded website does not prove the business has none.</p>
            <label className="text-sm">Priority score (0–100)<input name="priority_score" type="number" min="0" max="100" className="mt-2" defaultValue={b.priority_score??''}/></label>
            <label className="text-sm">Evidence behind score<input name="score_rationale" className="mt-2" defaultValue={b.score_rationale??''} placeholder="Observed, checkable reasons"/></label>
            <label className="text-sm md:col-span-2">Working notes<textarea name="notes" rows={4} className="mt-2" defaultValue={b.notes??''}/></label>
            <div className="md:col-span-2"><button type="submit" className="btn">Save lead changes</button></div>
          </form>
          {profileOnly&&presence.url&&<div className="mt-5 rounded-xl border border-amber-700/50 bg-amber-950/20 p-5">
            <p className="font-semibold text-amber-100">Profile found in website field</p>
            <p className="muted mt-2 break-all text-sm">{presence.provider}: {presence.url}</p>
            <p className="mt-2 text-xs text-amber-100">Move this recorded link to research evidence before saving other changes. It will remain attached to this prospect, but it will not count as a verified operating-business source or an auditable website.</p>
            <form action={moveProfileFromWebsite} className="mt-4">
              <input type="hidden" name="business_id" value={id}/>
              <button className="btn text-sm" type="submit">Move profile to research evidence →</button>
            </form>
          </div>}
        </section>
        <section className="panel p-7"><p className="kicker">Outreach record</p><h2 className="mt-2 text-xl font-semibold">Activity timeline</h2>
          <form action={addActivity} className="mt-5 space-y-3"><input type="hidden" name="business_id" value={id}/>
            <select name="activity_type">{['note','call','email','visit','meeting','proposal'].map(x=><option key={x}>{x}</option>)}</select>
            <textarea name="details" className="mt-2" rows={3} placeholder="What actually happened? Next steps?" required maxLength={1800}/>
            <button type="submit" className="btn">Log activity</button>
          </form>
          <div className="mt-6 space-y-3">{(activities??[]).map(a=><div key={a.id} className="border-t border-[#263742] py-3">
            <div className="flex justify-between gap-2"><strong className="capitalize text-sm">{a.activity_type}</strong><time className="muted text-xs">{new Date(a.occurred_at).toLocaleString('en-US')}</time></div><p className="muted mt-2 whitespace-pre-wrap text-sm">{a.details}</p></div>)}
            {!activities?.length&&<p className="muted text-sm">No outreach recorded yet.</p>}</div>
        </section>
      </div>
      <div className="space-y-6">
        <section className="panel p-7"><p className="kicker">Trust & provenance</p><h2 className="mt-2 text-xl font-semibold">Registry/source evidence</h2>
          <p className="muted mt-3 text-sm">A source starts pending. Confirm its match manually before marking this business verified.</p>
          <div className="mt-5 space-y-3">{(sources??[]).map(s=><div className="rounded-xl border border-[#243745] p-4" key={s.id}>
            <p className="text-sm font-semibold">{s.source_type==='social_profile'?'Social / directory profile':s.agency||s.source_type} <span className="muted">· {s.confidence}</span></p>
            {s.registration_number&&<p className="muted mt-1 text-xs">Registry ID: {s.registration_number}</p>}
            {s.source_url&&<a className="mt-2 block break-all text-sm text-cyan-300 underline" target="_blank" rel="noreferrer" href={s.source_url}>Open original record ↗</a>}
            {s.source_type==='social_profile'&&<p className="muted mt-2 text-xs">Research presence only, not independent business verification.</p>}
            {s.confidence==='pending'&&s.source_type!=='social_profile'&&classifyWebPresence(s.source_url).kind!=='social'&&classifyWebPresence(s.source_url).kind!=='listing'&&<form action={confirmSource} className="mt-3">
              <input type="hidden" name="business_id" value={id}/><input type="hidden" name="source_id" value={s.id}/>
              <button type="submit" className="btn text-xs">I inspected this record; it matches</button>
            </form>}</div>)}
          {!sources?.length&&<p className="muted text-sm">No sources attached.</p>}</div>
          <form action={addSource} className="mt-6 space-y-3 border-t border-[#243745] pt-5">
            <input type="hidden" name="business_id" value={id}/>
            <label className="block text-sm">Original record URL *<input className="mt-2" name="source_url" required placeholder="https://…"/></label>
            <label className="block text-sm">Source type<input className="mt-2" name="source_type" placeholder="MA registration, Boston DBA…"/></label>
            <label className="block text-sm">Agency<input className="mt-2" name="agency" placeholder="Registry / municipal agency"/></label>
            <label className="block text-sm">Registration number<input className="mt-2" name="registration_number"/></label>
            <label className="block text-sm">Raw legal name (as published)<input className="mt-2" name="raw_name"/></label>
            <label className="block text-sm">Raw registered address<input className="mt-2" name="raw_address"/></label>
            <button type="submit" className="btn">Attach evidence</button>
          </form>
          {b.verification_status!=='verified' && <form action={markVerified} className="mt-5 border-t border-[#243745] pt-5">
            <input type="hidden" name="business_id" value={id}/>
            <button type="submit" className="btn">Mark business verified</button>
            <p className="muted mt-2 text-xs">Requires a manually matched source and confirmed operating status.</p>
          </form>}
        </section>
        <section id="website-demo" className="panel scroll-mt-6 p-7"><p className="kicker">Proposal accelerator</p><h2 className="mt-2 text-xl font-semibold">Website demo drafts</h2>
          <p className="muted mt-2 text-xs">Drafts are internal. Nothing is published or shared automatically.</p>
          <p className="muted mt-3 text-sm">Industry suggestion: <strong>{industryLabel(industry)}</strong>. {industry.explanation}. Check or correct the industry category above before creating a draft. Old mismatched drafts are not silently overwritten.</p>
          <form action={createDemo} className="mt-5 grid gap-3"><input type="hidden" name="business_id" value={id}/>
          <div className="flex flex-wrap gap-3">
          <select name="template" aria-label="Website industry template"><option value="auto">Auto-match industry (recommended)</option>{[['landscaping','Home services if unclassified'],['medical','Medical / dental if unclassified'],['universal','Professional / general if unclassified']].map(([key,name])=><option key={key} value={key}>{name}</option>)}</select>
          <select name="visual_variant" aria-label="Design style">
            <option value="auto">Auto style</option>
            <option value="editorial">Editorial</option>
            <option value="bold">Bold</option>
          </select>
          </div>
          <div className="rounded-xl border border-[#2e5861] p-4">
           <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="generated_imagery_ack" required/>Use AI-generated concept imagery automatically. I understand it is not photography of this business.</label>
           <label className="mt-3 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="business_images_authorized"/>I am authorized to reuse imagery from this business&apos;s verified website.</label>
           <p className="muted mt-3 text-xs">This single authorization covers same-domain images collected during research. Unrelated sources remain excluded.</p>
          </div>
          <button className="btn justify-self-start" type="submit">Generate internal demo →</button></form>
          <div className="mt-5 space-y-2">{(demos??[]).map(d=><Link className="block rounded-xl border border-[#253a46] p-3 text-sm hover:bg-[#122531]" key={d.id} href={'/app/demos/'+d.id}>{d.template} · {d.status}{industry.template&&industry.template!==d.template?' · MISMATCH: regenerate':''} ↗</Link>)}</div>
        </section>
      </div>
    </div>
  </main>;
}
