import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';
import {rateDemo,saveDemoCopy,applyLearnedPreferences,importSiteResearch,researchBusinessWebsite,applyReviewedResearch,reviewImageRights} from '../feedback-actions';
import { derivePreferences, type DemoCopy, type FeedbackSample, type Template } from '@/lib/demo-engine';
import {classifyIndustry} from '@/lib/business-classification';
import { ArrowUpRight, ArrowDown, Check, BadgeInfo } from 'lucide-react';
import {buildSiteBlueprint} from '@/lib/site-blueprint';
import SiteRenderer from '@/components/site-renderer';
import {getMatchedConceptSet} from '@/lib/concept-imagery';
import {groupResearchInsights} from '@/lib/research-intelligence';
import {deriveSiteRedesignReference} from '@/lib/source-redesign-reference';
import {summarizeAssetRights} from '@/lib/asset-rights';

const issueOptions=[
 ['layout','Layout and hierarchy'],['visuals','Visual quality'],['generic_copy','Generic messaging'],
 ['missing_content','Missing real details'],['navigation','Navigation or CTA'],['mobile','Mobile layout'],['other','Other']
];
export default async function DemoPreview({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string;research_error?:string}>}){
  const {id}=await params;
  const {saved,research_error:researchError}=await searchParams;
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
  const preferences=derivePreferences((myRatings??[]) as FeedbackSample[],demo.template as Template,id);
  const variant=(copy.design?.variant??demo.visual_variant)==='bold'?'bold':'editorial';
  const site=buildSiteBlueprint(demo.template as Template,copy,{
    name:business?.name??'',city:business?.city,
    phone:business?.phone,email:business?.contact_email
  });
  const conceptMedia=getMatchedConceptSet(demo.template as Template,business?.category,site.services,site.businessName);
  const name=site.businessName;
  const services=site.services;
  const hero=site.content.images.find(x=>x.role==='hero');
  const assetRow=(x:{url:string;alt:string;sourceUrl:string;role:string})=>
    [x.url,x.alt,x.sourceUrl,x.role].join(' | ');
  const researchedImages=site.content.images.filter(x=>x.permission==='reference_only'&&x.role!=='hero');
  const approvedGallery=site.content.images.filter(x=>x.permission==='approved'&&x.role!=='hero');
  const researchGroups=groupResearchInsights(site.content.researchInsights);
  const siteReference=deriveSiteRedesignReference(site.content,demo.template as Template,site.services);
  const rights=summarizeAssetRights(site.content);
  return <main className="max-w-[1320px]">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div><Link href="/app/demos" className="muted text-sm">← Demo Studio</Link>
      <p className="kicker mt-3">Internal preview / revision {demo.revision_no??1} / {variant} / {demo.template}</p>
      <h1 className="mt-2 text-2xl font-semibold">{name}</h1></div>
      <div className="flex flex-wrap gap-3"><a className="btn" href="#demo-feedback">Rate & improve <ArrowDown size={15}/></a>
      <Link className="btn" href={'/preview/demos/'+id} target="_blank">Open full-screen site <ArrowUpRight size={15}/></Link>
      <Link className="btn" href={'/app/leads/'+demo.business_id}>CRM record <ArrowUpRight size={15}/></Link></div>
    </div>
    {saved&&<p role="status" className="mb-4 rounded-xl border border-[#2f726b] bg-[#14372f] p-3 text-sm text-[#bbebd8]">
      <Check className="mr-2 inline" size={16}/>{saved==='rating'?'Feedback saved. Your next generated demo now uses your updated preferences.':saved==='adapted'?'A new revision was created with your learned layout preferences.':saved==='unchanged'?'This demo already reflects your saved preferences.':saved==='research-applied'?'Reviewed research applied to a new private revision.':saved==='live-research'?'Live website research saved as sourced candidates for review.':saved==='research'?'Website research imported as unapproved references for review.':saved==='rights'?'Asset-rights decision saved in a new private revision.':'Copy saved as a new revision.'}
    </p>}
    {researchError&&<p role="alert" className="mb-4 rounded-xl border border-amber-700 bg-amber-950/30 p-3 text-sm text-amber-100">
     {researchError==='missing-website'?'This CRM record has no independent company website. Add and verify one before live research.':'The recorded site did not provide readable public pages within the safety limits. No research was saved.'}
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
       <span className="rounded-full border border-[#2a5053] px-4 py-2">Image rights: {rights.approved} approved · {rights.pending} pending · {rights.rejected} rejected</span>
       <span className="rounded-full border border-[#2a5053] px-4 py-2">Generated visual system: {site.content.generatedImageryEnabled?'Active':'Off'}</span>
       <span className="rounded-full border border-[#2a5053] px-4 py-2">Business-site photo authorization: {site.content.imageAuthorization.mode==='business_site_authorized'?'Recorded':'Not granted'}</span>
       <span className="rounded-full border border-[#2a5053] px-4 py-2">Motion system: Required · {site.design.motionPlan.sectionReveal.replaceAll('-',' ')}</span>
       <span className="rounded-full border border-[#2a5053] px-4 py-2">Quality preflight: {site.quality.evaluation.score}/100</span>
       <span className="rounded-full border border-[#2a5053] px-4 py-2">Composition: {site.design.composition.replaceAll('-',' ')}</span>
      </div>
      <details className="mt-5 rounded-xl border border-[#273b48] p-4 text-sm">
       <summary className="cursor-pointer font-semibold">Design specification and evaluation evidence</summary>
       <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div><p className="kicker">Generator rationale</p><ul className="mt-3 list-disc space-y-2 pl-5">
         {(copy.generationSpec?.rationale??['Legacy draft; save or apply preferences to generate a structured design specification.']).map(x=><li key={x}>{x}</li>)}
        </ul></div>
        <div><p className="kicker">Measured preflight</p><ul className="mt-3 list-disc space-y-2 pl-5">
         {site.quality.evaluation.evidence.map(x=><li key={x}>{x}</li>)}
        </ul><p className="muted mt-3 text-xs">This score is a deterministic content and design preflight, not a Lighthouse or screenshot score.</p></div>
       </div>
      </details>
      {site.quality.blockers.length>0&&<div className="mt-5 rounded-xl border border-amber-800/60 p-5">
       <p className="text-sm font-semibold text-amber-200">Before showing this to a prospect</p>
       <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-100/90">
        {site.quality.blockers.map(x=><li key={x}>{x}</li>)}
       </ul>
      </div>}
      {site.content.images.length>0&&<details className="mt-5 text-sm" open={rights.pending>0}>
       <summary className="cursor-pointer font-semibold">Asset rights queue ({rights.pending} awaiting review)</summary>
       <p className="muted mt-3 text-xs leading-5">A public photo or Google listing is only a reference. Approve an item only after independently confirming commercial display rights. Rejected items remain in the revision history and are never rendered.</p>
       <div className="mt-3 space-y-3">{site.content.images.map((img,i)=><div className="rounded-xl border border-[#273b48] p-4" key={i}>
        <p><strong>{img.role}</strong> · {img.permission==='approved'?'Approved for display':img.permission==='rejected'?'Rejected, not displayed':'Pending rights review, not displayed'}</p>
        <p className="muted mt-1 break-all">{img.alt}</p>
        <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-cyan-300 underline">View recorded source ↗</a>
        {img.rightsNote&&<p className="muted mt-2 text-xs leading-5">Review note: {img.rightsNote}</p>}
        <form action={reviewImageRights} className="mt-4 grid gap-3 rounded-lg bg-[#0c1b23] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
         <input type="hidden" name="demo_id" value={id}/><input type="hidden" name="revision_no" value={demo.revision_no??1}/><input type="hidden" name="asset_url" value={img.url}/>
         <label className="text-xs">Rights evidence or rejection reason<textarea className="mt-2" name="rights_evidence" rows={2} maxLength={500} defaultValue={img.rightsNote??''} required/></label>
         <div className="flex min-w-[190px] flex-col justify-end gap-2">
          <select name="decision" defaultValue={img.permission==='rejected'?'rejected':'approved'} aria-label="Asset rights decision"><option value="approved">Approve for display</option><option value="rejected">Reject asset</option></select>
          <label className="flex items-start gap-2 text-[11px] leading-4"><input className="mt-0.5" type="checkbox" name="rights_confirmed"/>I independently verified display permission. Required for approval.</label>
          <button type="submit" className="btn">Save rights decision</button>
         </div>
        </form>
       </div>)}</div>
      </details>}
    </section>
    <section className="panel mb-6 p-6">
      <p className="kicker">Content intelligence · local / no paid API</p>
      <h2 className="mt-2 text-xl font-semibold">Research the existing website before designing</h2>
      <p className="muted mt-3 text-sm leading-6">Inspect up to five public pages from this business’s recorded website. Command Center identifies source-backed candidates for services, team, gallery, trust, FAQs, booking, and contact structure. Nothing is treated as owner-approved copy or licensed photography.</p>
      <form action={researchBusinessWebsite} className="mt-5">
       <input type="hidden" name="demo_id" value={id}/><input type="hidden" name="revision_no" value={demo.revision_no??1}/>
       <button type="submit" className="btn">Research live company website →</button>
      </form>
      <details className="mt-5 text-sm"><summary className="cursor-pointer font-semibold">Local JSON fallback</summary>
       <p className="muted mt-3 text-xs leading-5">Use the approved one-business queue and local research script only when the in-app research action cannot read the site.</p>
      <form action={importSiteResearch} className="mt-5 flex flex-wrap items-end gap-4">
       <input type="hidden" name="demo_id" value={id}/>
       <input type="hidden" name="revision_no" value={demo.revision_no??1}/>
       <label className="min-w-[240px] flex-1 text-sm">Local site-research JSON file
        <input className="mt-2" type="file" name="researchFile" accept=".json,application/json" required/>
       </label>
       <button type="submit" className="btn">Import research references →</button>
      </form>
      </details>
      {site.content.researchPages.length>0&&<details className="mt-6 rounded-xl border border-[#2e5861] p-4" open>
       <summary className="cursor-pointer text-sm font-semibold">Sourced candidates · {site.content.researchPages.length} inspected pages · {site.content.images.filter(x=>x.permission==='reference_only').length} unapproved image references</summary>
       <p className="muted mt-3 text-xs">Candidate text is NOT verified practice information. Independently check it, rewrite appropriately, and obtain image permission before use in a real site.</p>
       <div className="mt-5 rounded-xl border border-[#2e5861] p-4" data-testid="existing-site-design-reference">
        <h3 className="text-sm font-semibold">Existing-website redesign reference</h3>
        <p className="muted mt-2 text-xs leading-5">This plan starts with the company&apos;s researched public site instead of treating every prospect as the same template. Research evidence is for private design planning until reviewed.</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
         <div><dt className="muted text-xs">Original site</dt><dd className="mt-1 break-all">{siteReference.sourceHosts.join(', ')||'No reference yet'}</dd></div>
         <div><dt className="muted text-xs">Suggested composition</dt><dd className="mt-1">{siteReference.recommendedComposition.replaceAll('-',' ')}</dd></div>
         <div><dt className="muted text-xs">Photos with display approval</dt><dd className="mt-1">{siteReference.approvedImages}</dd></div>
         <div><dt className="muted text-xs">Imagery direction</dt><dd className="mt-1">{siteReference.mediaPlan.replaceAll('-',' ')}</dd></div>
         <div><dt className="muted text-xs">Original theme-color cues (unverified)</dt><dd className="mt-1">{siteReference.sourceThemeColors.join(', ')||'Not detected'}</dd></div>
         <div><dt className="muted text-xs">Original photo references awaiting permission</dt><dd className="mt-1">{siteReference.unapprovedImageReferences}</dd></div>
         <div><dt className="muted text-xs">Rejected source images</dt><dd className="mt-1">{siteReference.rejectedImages}</dd></div>
        </dl>
        {siteReference.warnings.length>0&&<ul className="muted mt-4 list-disc space-y-1 pl-5 text-xs leading-5">{siteReference.warnings.map(w=><li key={w}>{w}</li>)}</ul>}
        {siteReference.imageBriefs.length>0&&<details className="mt-4 border-t border-[#2e5861] pt-4"><summary className="cursor-pointer text-xs font-semibold">AI conceptual image briefs for later generation</summary>
         <ol className="muted mt-3 list-decimal space-y-2 pl-5 text-xs leading-5">{siteReference.imageBriefs.map(x=><li key={x}>{x}</li>)}</ol>
         <p className="muted mt-3 text-xs">These are NOT generated photos and must not be presented as real business facilities, staff, or completed projects.</p>
        </details>}
       </div>
       <div className="mt-4 grid gap-4 lg:grid-cols-2">{site.content.researchPages.map(page=><div className="rounded-xl border border-[#273b48] p-4" key={page.url}>
        <a className="break-all text-sm font-semibold text-cyan-300 underline" href={page.url} target="_blank" rel="noopener noreferrer">{page.title||page.url} ↗</a>
        {page.description&&<p className="muted mt-2 text-xs leading-5">{page.description}</p>}
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-cyan-200">Discovered headings</p>
        <p className="mt-2 text-sm leading-6">{page.headings.slice(0,12).join(' · ')||'None available'}</p>
       </div>)}</div>
       {site.content.researchInsights.length>0&&<form action={applyReviewedResearch} className="mt-5 border-t border-[#2e5861] pt-5">
        <input type="hidden" name="demo_id" value={id}/><input type="hidden" name="revision_no" value={demo.revision_no??1}/>
        <p className="text-sm font-semibold">Detected content modules · {site.content.researchInsights.length} sourced candidates</p>
        <p className="muted mt-2 text-xs">Select only candidates you checked against their linked source. This updates the private revision, not publication approval.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Object.entries(researchGroups).map(([kind,items])=><div className="rounded-xl bg-[#0c1b23] p-4" key={kind}>
         <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">{kind}</p>
         <ul className="mt-3 space-y-2 text-sm">{items?.slice(0,8).map(item=><li className="flex items-start gap-2" key={item.id}><input className="mt-1" type="checkbox" name="insight" value={item.id} defaultChecked={item.status==='reviewed'}/><a className="underline decoration-white/20 underline-offset-4 hover:decoration-white" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.label}</a></li>)}</ul>
        </div>)}</div>
        <button className="btn mt-4" type="submit">Apply reviewed research to next revision →</button>
       </form>}
      </details>}
    </section>
    <SiteRenderer site={site} conceptMedia={conceptMedia}/>
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
            <p className="text-sm font-semibold">Image system</p>
            <p className="muted mt-2 text-xs leading-5">Generated concept images can be selected and placed automatically. One saved authorization can also cover imagery collected from this business&apos;s verified website.</p>
            <label className="mt-4 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="generatedImageryEnabled" defaultChecked={site.content.generatedImageryEnabled}/>
             Use expansive AI-generated imagery throughout the site when approved business photography is unavailable.</label>
            <label className="mt-3 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="businessImagesAuthorized" defaultChecked={site.content.imageAuthorization.mode==='business_site_authorized'}/>
             I am authorized to reuse imagery from this business&apos;s verified website. Apply this authorization to same-domain research images automatically.</label>
            <p className="muted mt-3 text-xs">Unrelated websites, competitors, and unknown sources are never covered by this authorization.</p>
            <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Add or override individual business photos</summary>
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
            </details>
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
