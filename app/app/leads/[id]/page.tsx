import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';
import { addActivity,addSource,confirmSource,markVerified,moveProfileFromWebsite,updateLead } from '../actions';
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
  const [{data:sources},{data:activities},{data:demos}]=await Promise.all([
    supabase.from('business_sources').select('*').eq('organization_id',organizationId).eq('business_id',id).order('recorded_at',{ascending:false}),
    supabase.from('business_activities').select('*').eq('organization_id',organizationId).eq('business_id',id).order('occurred_at',{ascending:false}).limit(30),
    supabase.from('demo_sites').select('id,template,status,created_at').eq('organization_id',organizationId).eq('business_id',id).order('created_at',{ascending:false}),
  ]);
  return <main className="max-w-6xl">
    <Link href="/app/leads" className="muted text-sm">← All prospects</Link>
    <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
      <div><p className="kicker">{b.city||'Location pending'} · {b.category||'Category pending'}</p>
      <h1 className="mt-2 text-4xl font-semibold">{b.name}</h1>
      <p className="muted mt-3">Verification: {b.verification_status} · Operational status: {b.operational_status}</p></div>
      <div className="flex gap-3">{presence.url && <a className="btn" target="_blank" rel="noopener noreferrer" href={presence.url}>{profileOnly?'Visit '+presence.provider+' profile ↗':'Visit website ↗'}</a>}
        {b.google_business_url && <a className="btn" target="_blank" rel="noreferrer" href={b.google_business_url}>Google profile ↗</a>}</div>
    </div>
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
        <section className="panel p-7"><p className="kicker">Proposal accelerator</p><h2 className="mt-2 text-xl font-semibold">Website demo drafts</h2>
          <p className="muted mt-3 text-sm">Industry suggestion: <strong>{industryLabel(industry)}</strong>. {industry.explanation}. Check or correct the industry category above before creating a draft. Old mismatched drafts are not silently overwritten.</p>
          <form action={createDemo} className="mt-5 flex flex-wrap gap-3"><input type="hidden" name="business_id" value={id}/>
          <select name="template" aria-label="Website industry template"><option value="auto">Auto-match industry (recommended)</option>{[['landscaping','Home services if unclassified'],['medical','Medical / dental if unclassified'],['universal','Professional / general if unclassified']].map(([key,name])=><option key={key} value={key}>{name}</option>)}</select>
          <select name="visual_variant" aria-label="Design style">
            <option value="auto">Auto style</option>
            <option value="editorial">Editorial</option>
            <option value="bold">Bold</option>
          </select>
          <button className="btn" type="submit">Generate internal demo →</button></form>
          <div className="mt-5 space-y-2">{(demos??[]).map(d=><Link className="block rounded-xl border border-[#253a46] p-3 text-sm hover:bg-[#122531]" key={d.id} href={'/app/demos/'+d.id}>{d.template} · {d.status}{industry.template&&industry.template!==d.template?' · MISMATCH: regenerate':''} ↗</Link>)}</div>
        </section>
      </div>
    </div>
  </main>;
}
