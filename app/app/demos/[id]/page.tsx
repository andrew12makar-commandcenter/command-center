import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';
import { rateDemo,saveDemoCopy,applyLearnedPreferences } from '../feedback-actions';
import { derivePreferences, type DemoCopy, type FeedbackSample, type Template } from '@/lib/demo-engine';
import {classifyIndustry} from '@/lib/business-classification';
import { ArrowUpRight, ArrowDown, Check, BadgeInfo } from 'lucide-react';
import {buildSiteBlueprint} from '@/lib/site-blueprint';
import SiteRenderer from '@/components/site-renderer';

const issueOptions=[
 ['layout','Layout and hierarchy'],['visuals','Visual quality'],['generic_copy','Generic messaging'],
 ['missing_content','Missing real details'],['navigation','Navigation or CTA'],['mobile','Mobile layout'],['other','Other']
];
export default async function DemoPreview({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}){
  const {id}=await params;
  const {saved}=await searchParams;
  const {supabase,organizationId,user}=await requireWorkspace();
  const {data:demo,error}=await supabase.from('demo_sites').select('*')
    .eq('id',id).eq('organization_id',organizationId).maybeSingle();
  if(error||!demo) notFound();
  const [{data:business},{data:feedback},{data:revisions},{data:myFeedback},{data:myRatings}]=await Promise.all([
    supabase.from('businesses').select('name,city,phone,contact_email,website_url,category')
      .eq('id',demo.business_id).eq('organization_id',organizationId).maybeSingle(),
    supabase.from('demo_feedback').select('rating,issue_tags,notes,created_at,revision_no')
      .eq('demo_id',id).eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(10),
    supabase.from('demo_revisions').select('revision_no,created_at')
      .eq('demo_id',id).eq('organization_id',organizationId).order('revision_no',{ascending:false}).limit(10),
    supabase.from('demo_feedback').select('rating,issue_tags,notes')
      .eq('demo_id',id).eq('organization_id',organizationId).eq('user_id',user.id).eq('revision_no',demo.revision_no).maybeSingle(),
    supabase.from('demo_feedback').select('demo_id,user_id,template,visual_variant,rating,issue_tags,notes,created_at')
      .eq('organization_id',organizationId).eq('user_id',user.id).order('created_at',{ascending:false}).limit(200)
  ]);
  const industry=classifyIndustry(business?.name||'',business?.category);
  const industryMismatch=Boolean(industry.template&&industry.template!==demo.template);
  const copy=(demo.draft_content??{}) as Partial<DemoCopy>;
  const preferences=derivePreferences((myRatings??[]) as FeedbackSample[],demo.template as Template);
  const variant=(copy.design?.variant??demo.visual_variant)==='bold'?'bold':'editorial';
  const site=buildSiteBlueprint(demo.template as Template,copy,{
    name:business?.name??'',city:business?.city,
    phone:business?.phone,email:business?.contact_email
  });
  const name=site.businessName;
  const services=site.services;
  const hero=site.content.images.find(x=>x.role==='hero');
  const assetRow=(x:{url:string;alt:string;sourceUrl:string;role:string})=>
    [x.url,x.alt,x.sourceUrl,x.role].join(' | ');
  const researchedImages=site.content.images.filter(x=>x.permission==='reference_only'&&x.role!=='hero');
  const approvedGallery=site.content.images.filter(x=>x.permission==='approved'&&x.role!=='hero');
  return <main className="max-w-[1320px]">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div><Link href="/app/demos" className="muted text-sm">← Demo Studio</Link>
      <p className="kicker mt-3">Internal preview / revision {demo.revision_no??1} / {variant} / {demo.template}</p>
      <h1 className="mt-2 text-2xl font-semibold">{name}</h1></div>
      <div className="flex flex-wrap gap-3"><a className="btn" href="#demo-feedback">Rate & improve <ArrowDown size={15}/></a>
      <Link className="btn" href={'/app/leads/'+demo.business_id}>CRM record <ArrowUpRight size={15}/></Link></div>
    </div>
    {saved&&<p role="status" className="mb-4 rounded-xl border border-[#2f726b] bg-[#14372f] p-3 text-sm text-[#bbebd8]">
      <Check className="mr-2 inline" size={16}/>{saved==='rating'?'Feedback saved. Your next generated demo now uses your updated preferences.':saved==='adapted'?'A new revision was created with your learned layout preferences.':saved==='unchanged'?'This demo already reflects your saved preferences.':'Copy saved as a new revision.'}
    </p>}
    <section className="panel mb-6 p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div><p className="kicker">Internal performance-led build plan</p>
          <h2 className="mt-2 text-lg font-semibold">Build to measurable requirements, not guesses</h2></div>
        <Link href={'/app/leads/'+demo.business_id+'/brief'} className="text-sm text-cyan-300 underline">Open evidence & sales brief ↗</Link>
      </div>
      <p className="muted mt-3 text-sm">Confidence: {copy.internalBuildPlan?.confidence?.replaceAll('_',' ')||'Not measured'}.
        {' '}Existing website results are not automatically attributed to this draft. Demo mobile performance: <strong>not benchmarked.</strong>
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6">
        {(copy.internalBuildPlan?.goals?.length?copy.internalBuildPlan.goals:[
          'Keep initial mobile content lightweight.',
          'Preserve owner-approved navigation and contact actions.',
          'Benchmark a deployed demo before claiming speed improvements.'
        ]).map((goal,i)=><li key={i}>{goal}</li>)}
      </ul>
      <p className="muted mt-3 text-xs">Internal implementation guidance only. Customer-facing copy is not automatically altered by the audit.</p>
    </section>
    {industryMismatch&&<div role="alert" className="mb-5 rounded-xl border border-amber-600 bg-amber-950/30 px-5 py-4 text-sm text-amber-100">
      <strong>Wrong industry template in saved draft.</strong> The current CRM category suggests {industry.template}, but this older draft uses {demo.template}. Do not use it for outreach. <Link href={'/app/leads/'+demo.business_id} className="underline">Open the CRM and regenerate using Auto-match ↗</Link>
    </div>}
    <div className="mb-5 rounded-xl border border-amber-700/40 bg-amber-950/20 px-5 py-3 text-sm text-amber-200">
      <BadgeInfo className="mr-2 inline" size={16}/>Private concept. This is not an approved business website. Verify facts and obtain permission before sharing.
    </div>
    <section className="panel mb-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
       <div><p className="kicker">Production-quality review</p>
        <h2 className="mt-2 text-lg font-semibold">Site Blueprint · v{site.version}</h2></div>
       <a className="btn" href={'/app/api/demos/'+id+'/blueprint'}>Export site blueprint ↗</a>
      </div>
      <p className="muted mt-3 text-sm">This same rendering engine can be reused for your own future client websites. Source research and approval happen separately from layout generation. Export is private and does not publish a site.</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
       <span className="rounded-full border border-[#2a5053] px-4 py-2">Private preview: {site.quality.previewReady?'Content reviewed':'Research incomplete'}</span>
       <span className="rounded-full border border-[#2a5053] px-4 py-2">Publishing: {site.quality.publishReady?'Meets basic content gate':'Blocked until approval'}</span>
       <span className="rounded-full border border-[#2a5053] px-4 py-2">Approved images: {site.content.images.filter(x=>x.permission==='approved').length}</span>
      </div>
      {site.quality.blockers.length>0&&<div className="mt-5 rounded-xl border border-amber-800/60 p-5">
       <p className="text-sm font-semibold text-amber-200">Before showing this to a prospect</p>
       <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-100/90">
        {site.quality.blockers.map(x=><li key={x}>{x}</li>)}
       </ul>
      </div>}
      {site.content.images.length>0&&<details className="mt-5 text-sm">
       <summary className="cursor-pointer font-semibold">Asset provenance and permission inventory ({site.content.images.length})</summary>
       <div className="mt-3 space-y-3">{site.content.images.map((img,i)=><div className="rounded-xl border border-[#273b48] p-3" key={i}>
        <p><strong>{img.role}</strong> · {img.permission==='approved'?'Operator-confirmed permission':'Reference only, not displayed'}</p>
        <p className="muted mt-1 break-all">{img.alt}</p>
        <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-cyan-300 underline">View recorded source ↗</a>
       </div>)}</div>
      </details>}
    </section>
    <SiteRenderer site={site}/>
    <div id="demo-feedback" className="mt-9 grid scroll-mt-8 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="panel min-w-0 p-5 sm:p-7"><p className="kicker">Iterative improvement</p><h2 className="mt-2 text-xl font-semibold">Rate this version</h2>
        <p className="muted mt-3 text-sm">Your rating immediately shapes the next demo. Criticisms like cramped navigation or generic copy also become design settings.</p>
        <form action={rateDemo} className="mt-6 space-y-4"><input type="hidden" name="demo_id" value={id}/>
          <fieldset><legend className="text-sm font-semibold">Overall design quality</legend>
            <div className="mt-3 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Overall design quality">
              {[1,2,3,4,5].map(n=><label className="feedback-rating" key={n}>
                <input type="radio" name="rating" value={n} defaultChecked={myFeedback?.rating===n} required aria-label={n+' out of 5'}/>
                <span>{n}</span>
              </label>)}
            </div><p className="muted mt-2 text-xs">1 = Needs major work · 5 = Ready for refinement</p>
          </fieldset>
          <fieldset><legend className="text-sm font-semibold">What needs improving?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {issueOptions.map(([key,label])=><label key={key} className="feedback-choice text-sm">
                <input type="checkbox" name="issues" value={key} defaultChecked={myFeedback?.issue_tags?.includes(key)}/>
                <span className="min-w-0 leading-5">{label}</span>
              </label>)}
            </div>
          </fieldset>
          <label className="block text-sm">Specific feedback<textarea name="notes" className="mt-2" rows={4} maxLength={1200} defaultValue={myFeedback?.notes??''} placeholder="For example: smaller headline, tighter spacing, less copy, more visible contact button…"/></label>
          <button type="submit" className="btn">Save feedback</button>
        </form>
        <div className="mt-7 rounded-2xl border border-[#2e5861] bg-[#112a35] p-5">
          <p className="kicker">Your learned direction · Updated after every rating</p>
          <h3 className="mt-2 text-base font-semibold">{preferences.feedbackCount} rating{preferences.feedbackCount===1?'':'s'} considered</h3>
          <div className="mt-4 space-y-2">
            {preferences.learnedFrom.length?preferences.learnedFrom.map(line=><p key={line} className="flex items-start gap-2 text-sm text-[#c6dae0]"><Check size={15} className="mt-0.5 shrink-0 text-cyan-300"/>{line}</p>):<p className="muted text-sm">Rate this version to start adapting future layouts.</p>}
          </div>
          <p className="muted mt-4 text-xs">New demos use these settings automatically. Free-form feedback is saved; only recognized instructions currently change the generator. No AI model is retrained.</p>
          {preferences.feedbackCount>0&&<form action={applyLearnedPreferences} className="mt-4">
            <input type="hidden" name="demo_id" value={id}/><input type="hidden" name="revision_no" value={demo.revision_no??1}/>
            <button type="submit" className="btn w-full">Apply my preferences to this demo →</button>
            <p className="muted mt-2 text-xs">Creates a new version without overwriting this one or changing your verified copy.</p>
          </form>}
        </div>
        <div className="mt-7 border-t border-[#2e424c] pt-5"><h3 className="text-sm font-semibold">Recent feedback</h3>
          {(feedback??[]).map((f,i)=><div className="mt-3 rounded-xl border border-[#2a3d46] p-3 text-sm" key={i}>
            <strong>{f.rating}/5 · revision {f.revision_no}</strong><p className="muted mt-1">{f.issue_tags?.join(', ')||'No issue categories'}</p>{f.notes&&<p className="mt-2">{f.notes}</p>}
          </div>)}
          {!feedback?.length&&<p className="muted mt-3 text-sm">No reviews yet. Your first review starts the improvement history.</p>}
        </div>
      </section>
      <section className="panel p-7"><p className="kicker">Human-approved content</p><h2 className="mt-2 text-xl font-semibold">Website content & photography</h2>
        <p className="muted mt-3 text-sm">Build a source-backed content pack that can be reused in actual client websites. Each save creates a new revision and keeps existing functionality.</p>
        <form action={saveDemoCopy} className="mt-6 grid gap-4"><input type="hidden" name="demo_id" value={id}/>
          <input type="hidden" name="revision_no" value={demo.revision_no??1}/>
          <label className="text-sm">Business name<input className="mt-2" name="brand" maxLength={140} defaultValue={name} required/></label>
          <label className="text-sm">Location eyebrow<input className="mt-2" name="eyebrow" maxLength={130} defaultValue={copy.eyebrow??''}/></label>
          <label className="text-sm">Headline<input className="mt-2" name="headline" maxLength={200} defaultValue={copy.headline??''} required/></label>
          <label className="text-sm">Description<textarea className="mt-2" name="description" rows={4} maxLength={800} defaultValue={copy.description??''}/></label>
          <div className="rounded-xl border border-[#2e5861] p-4">
            <p className="text-sm font-semibold">Real business photography</p>
            <p className="muted mt-2 text-xs leading-5">You may record existing photos for research without displaying them. Only photos you confirm you have the right to use may appear on the website. Do not assume that public availability grants reuse rights.</p>
            <label className="mt-4 block text-sm">Hero image URL<input className="mt-2" type="url" name="heroImageUrl" defaultValue={hero?.url??copy.heroImageUrl??''} placeholder="https://example.org/practice-photo.jpg"/></label>
            <label className="mt-3 block text-sm">Where the image came from<input className="mt-2" type="url" name="heroImageSourceUrl" defaultValue={hero?.sourceUrl??''} placeholder="https://business.example/gallery/"/></label>
            <label className="mt-3 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="heroImageApproved" defaultChecked={hero?.permission==='approved'}/>
             I confirmed permission to use the hero photo in this concept.</label>
            <label className="mt-4 block text-sm">Photo references for later permission review
             <textarea className="mt-2" name="imageReferences" rows={3} maxLength={6000}
              defaultValue={researchedImages.map(assetRow).join('\n')} placeholder="Image URL | Description | Source page URL | gallery"/>
            </label>
            <label className="mt-3 block text-sm">Approved gallery photos (one per line)
             <textarea className="mt-2" name="approvedGallery" rows={4} maxLength={6000}
              defaultValue={approvedGallery.map(assetRow).join('\n')} placeholder="Image URL | Description | Source page URL | gallery"/>
            </label>
            <label className="mt-3 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="galleryRightsApproved" defaultChecked={approvedGallery.length>0}/>
             I confirmed the rights to display every image listed in the approved gallery.</label>
          </div>
          <label className="text-sm">Confirmed services (one per line)<textarea className="mt-2" name="services" rows={5} maxLength={1000} defaultValue={services.join('\n')} placeholder="Only services verified by the business"/></label>
          <div className="rounded-xl border border-[#2e5861] p-4">
           <h3 className="text-sm font-semibold">Business-specific content pack</h3>
           <p className="muted mt-2 text-xs">The same content package will power this private concept and later client sites. No claims or testimonials are invented automatically.</p>
           <label className="mt-4 block text-sm">Practice / company introduction<textarea name="siteAbout" className="mt-2" rows={5} maxLength={1100} defaultValue={site.content.about} placeholder="Specific, sourced introduction; not generic marketing copy"/></label>
           <label className="mt-4 block text-sm">Audience or positioning (optional)<input name="siteAudience" className="mt-2" maxLength={200} defaultValue={site.content.audience}/></label>
           <label className="mt-4 block text-sm">Source for factual details<input type="url" name="siteSourceUrl" className="mt-2" defaultValue={site.content.sourceUrl??''} placeholder="https://practice.example/about"/></label>
           <label className="mt-4 block text-sm">Appointment or booking link (only if independently confirmed)<input type="url" name="appointmentUrl" className="mt-2" defaultValue={site.content.appointmentUrl??''} placeholder="https://business.example/appointments"/></label>
           <label className="mt-4 block text-sm">Research and approval stage
             <select name="factStatus" className="mt-2" defaultValue={site.content.factStatus}>
              <option value="unreviewed">Unreviewed · internal research</option>
              <option value="researched">Researched · independently checked facts, private preview only</option>
              <option value="owner_approved">Owner approved · I have explicit approval of business content</option>
             </select>
           </label>
           <label className="mt-4 block text-sm">Hero treatment
             <select name="heroTreatment" className="mt-2" defaultValue={site.content.heroTreatment}>
              <option value="typographic">Premium typographic, no photo</option>
              <option value="photo-led">Use an approved photo when available</option>
             </select>
           </label>
          </div>
          <label className="text-sm">Primary button text<input className="mt-2" name="primaryAction" maxLength={65} defaultValue={copy.primaryAction??''}/></label>
          <label className="text-sm">Secondary button text<input className="mt-2" name="secondaryAction" maxLength={65} defaultValue={copy.secondaryAction??''}/></label>
          <button className="btn" type="submit">Save new revision</button>
        </form>
        <div className="mt-7 border-t border-[#2e424c] pt-5"><h3 className="text-sm font-semibold">Saved revisions</h3>
          {(revisions??[]).map(r=><p className="muted mt-2 text-sm" key={r.revision_no}>Version {r.revision_no} · {new Date(r.created_at).toLocaleString('en-US')}</p>)}
          {!revisions?.length&&<p className="muted mt-3 text-sm">Version 1 is the original draft. Its snapshot is stored when you save the first edit.</p>}
        </div>
      </section>
    </div>
  </main>;
}
