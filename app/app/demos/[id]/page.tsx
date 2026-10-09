import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';
import { rateDemo,saveDemoCopy,applyLearnedPreferences } from '../feedback-actions';
import { derivePreferences, type DemoCopy, type FeedbackSample, type Template } from '@/lib/demo-engine';
import { ArrowUpRight, ArrowDown, Check, Phone, Mail, MapPin, Leaf, Sparkles, ShieldCheck, BadgeInfo } from 'lucide-react';

const variants = {
 editorial: {
   surface:'bg-[#f6f5ef] text-[#152b27]', hero:'bg-[#e7ece4]', eyebrow:'text-[#51776c]',
   action:'bg-[#173d33] text-white', detail:'bg-[#d9e5d9]', border:'border-[#cad5ce]',dark:'bg-[#173d33] text-white'
 },
 bold: {
   surface:'bg-[#f7f4eb] text-[#231f1d]',hero:'bg-[#e9dac1]',eyebrow:'text-[#9a4f30]',
   action:'bg-[#aa4f30] text-white',detail:'bg-[#e0ccb0]',border:'border-[#d6bca0]',dark:'bg-[#302920] text-white',
 }
} as const;
const sectorInfo:Record<string,{label:string;intro:string;icon:typeof Leaf}> = {
 landscaping:{label:'OUTDOOR SERVICES',intro:'Thoughtful spaces begin with a straightforward conversation.',icon:Leaf},
 medical:{label:'PATIENT SERVICES',intro:'A simpler starting point for patients and families.',icon:ShieldCheck},
 universal:{label:'LOCAL PROFESSIONALS',intro:'Straightforward information. A better first impression.',icon:Sparkles},
};
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
  const copy=(demo.draft_content??{}) as Partial<DemoCopy>;
  const preferences=derivePreferences((myRatings??[]) as FeedbackSample[],demo.template as Template);
  const variant=(copy.design?.variant??demo.visual_variant)==='bold'?'bold':'editorial';
  const style=variants[variant];
  const design=copy.design;
  const info=sectorInfo[demo.template]??sectorInfo.universal;
  const MainIcon=info.icon;
  const name=copy.brand||business?.name||'Business name pending';
  const services=(copy.services??[]).filter(Boolean);
  const hasContact=Boolean(business?.contact_email||business?.phone);
  const phoneHref=business?.phone?'tel:'+String(business.phone).replace(/[^+\d]/g,''):null;
  const emailHref=business?.contact_email?'mailto:'+business.contact_email:null;
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
    <div className="mb-5 rounded-xl border border-amber-700/40 bg-amber-950/20 px-5 py-3 text-sm text-amber-200">
      <BadgeInfo className="mr-2 inline" size={16}/>Private concept. This is not an approved business website. Verify facts and obtain permission before sharing.
    </div>
    <div className={`overflow-hidden rounded-[24px] shadow-2xl shadow-black/30 ${style.surface}`}>
      <header className={`flex flex-wrap items-center justify-between gap-5 px-7 py-6 sm:px-12 ${style.surface}`}>
        <a href="#home" className="max-w-xs text-xl font-semibold tracking-tight">{name}</a>
        <nav aria-label="Demo navigation" className={`flex flex-wrap gap-5 text-xs font-bold uppercase tracking-wider ${design?.prominentNav?'rounded-full border border-current/20 px-5 py-3':''}`}>
          <a href="#services" className="hover:underline">Services</a><a href="#about" className="hover:underline">About</a><a href="#contact" className="hover:underline">Contact</a>
        </nav>
      </header>
      <section id="home" className={`relative grid items-center gap-10 overflow-hidden px-7 sm:px-12 lg:grid-cols-[1.1fr_.9fr] ${design?.compact?'py-10 lg:py-12':'py-16 lg:py-20'} ${style.hero}`}>
        <div className="relative z-10">
          <div className={`mb-7 inline-flex items-center gap-2 rounded-full border border-current/25 px-4 py-2 text-[10px] font-bold uppercase tracking-[.2em] ${style.eyebrow}`}><MainIcon size={15}/>{copy.eyebrow||info.label}</div>
          <h2 className="max-w-[680px] text-[clamp(2.2rem,3.8vw,4.5rem)] font-semibold leading-[1.06] tracking-[-.055em]">{copy.headline||info.intro}</h2>
          <p className="mt-7 max-w-lg text-base leading-8 opacity-80">{copy.description||'Business-approved messaging will appear here.'}</p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <a href="#contact" className={`inline-flex items-center gap-3 rounded-full px-7 py-4 text-sm font-semibold ${style.action}`}>{copy.primaryAction||'Get in touch'}<ArrowUpRight size={18}/></a>
            <a href="#services" className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">{copy.secondaryAction||'View services'}<ArrowDown size={16}/></a>
          </div>
        </div>
        <div className={`relative mx-auto flex ${design?.compact?'min-h-[250px]':'min-h-[350px]'} w-full max-w-[530px] items-center justify-center overflow-hidden rounded-[24px] ${style.dark}`}>
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/25"></div>
          <div className="absolute -left-28 -bottom-28 h-80 w-80 rounded-full border border-white/20"></div>
          <div className="absolute inset-8 rounded-[200px_200px_30px_30px] border border-white/20"></div>
          <div className="relative z-10 p-12 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/30 bg-white/10"><MainIcon size={46} strokeWidth={1}/></div>
            <p className="mt-7 text-xs font-bold tracking-[.3em] opacity-60">DESIGNED FOR</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{business?.city||'Local communities'}</p>
            <p className="mt-3 text-sm opacity-70">{info.label.replaceAll('_',' ').toLowerCase()}</p>
          </div>
        </div>
      </section>
      <section id="services" className="px-7 py-16 sm:px-12 lg:py-24">
        <div className="max-w-2xl"><p className={`text-xs font-bold uppercase tracking-[.22em] ${style.eyebrow}`}>What we can showcase</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Make it easy to understand the work.</h3></div>
        {services.length ? <div className="mt-10 grid gap-4 md:grid-cols-3">{services.map((item,i)=><article key={item+i} className={`min-h-44 rounded-2xl border p-7 ${style.border}`}>
          <p className="mb-9 text-xs opacity-50">0{i+1}</p><h4 className="text-xl font-semibold">{item}</h4>
        </article>)}</div> : <div className={`mt-10 rounded-2xl border border-dashed px-8 py-10 ${style.border}`}>
          <p className="text-lg font-medium">Real services haven't been confirmed yet.</p>
          <p className="mt-2 text-sm opacity-70">Add the business's actual offerings in the editor below. We will not invent them.</p></div>}
      </section>
      <section id="about" className={`grid gap-8 px-7 py-16 sm:px-12 lg:grid-cols-2 lg:items-center lg:py-20 ${style.detail}`}>
        <div><p className={`text-xs font-bold uppercase tracking-widest ${style.eyebrow}`}>A clearer customer journey</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Good websites answer the right questions.</h3></div>
        <p className="max-w-lg text-base leading-8 opacity-75">Services, location, availability, and how to get in touch. This layout is designed to organize those details, once they are verified with the business.</p>
      </section>
      <section id="contact" className={`flex flex-wrap items-center justify-between gap-9 px-7 py-16 sm:px-12 lg:py-20 ${style.dark}`}>
        <div><p className="text-xs font-bold uppercase tracking-[.22em] opacity-60">Connect</p>
          <h3 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight sm:text-5xl">Ready to start a conversation?</h3>
          <p className="mt-5 text-sm opacity-70">{hasContact?'Contact information was supplied in the CRM and should be verified before publishing.':'Confirm the business contact details before this concept is shared.'}</p></div>
        <div className="flex flex-col gap-3 text-sm">{phoneHref&&<a className="flex items-center gap-3 underline" href={phoneHref}><Phone size={18}/> Call business</a>}
          {emailHref&&<a className="flex items-center gap-3 underline" href={emailHref}><Mail size={18}/> Email business</a>}
          {business?.city&&<span className="flex items-center gap-3"><MapPin size={18}/>{business.city}</span>}
          {!hasContact&&<span className="text-sm opacity-65">Contact method to be confirmed.</span>}</div>
      </section>
      <footer className="px-7 py-7 text-xs opacity-65 sm:px-12">{copy.disclaimer||'Independent demo concept. Details require verification.'}</footer>
    </div>
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
      <section className="panel p-7"><p className="kicker">Human-approved content</p><h2 className="mt-2 text-xl font-semibold">Edit demo copy</h2>
        <p className="muted mt-3 text-sm">Update the copy using business-confirmed facts. Each save creates a new version rather than deleting the previous text.</p>
        <form action={saveDemoCopy} className="mt-6 grid gap-4"><input type="hidden" name="demo_id" value={id}/>
          <input type="hidden" name="revision_no" value={demo.revision_no??1}/>
          <label className="text-sm">Business name<input className="mt-2" name="brand" maxLength={140} defaultValue={name} required/></label>
          <label className="text-sm">Location eyebrow<input className="mt-2" name="eyebrow" maxLength={130} defaultValue={copy.eyebrow??''}/></label>
          <label className="text-sm">Headline<input className="mt-2" name="headline" maxLength={200} defaultValue={copy.headline??''} required/></label>
          <label className="text-sm">Description<textarea className="mt-2" name="description" rows={4} maxLength={800} defaultValue={copy.description??''}/></label>
          <label className="text-sm">Confirmed services (one per line)<textarea className="mt-2" name="services" rows={5} maxLength={1000} defaultValue={services.join('\n')} placeholder="Only services verified by the business"/></label>
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
