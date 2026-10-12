import type {SiteBlueprint} from '@/lib/site-blueprint';
import {contactJourney,selectSectionPresentation} from '@/lib/site-presentation';
import {reviewedSiteFeatures} from '@/lib/reviewed-business-features';

type Tone={base:string;paper:string;ink:string;soft:string;muted:string;eyebrow:string;border:string};
type Props={site:SiteBlueprint;theme:Tone;compact:boolean};
const pad='px-6 sm:px-10 lg:px-[6vw]';
const index=(n:number)=>String(n+1).padStart(2,'0');

export function IndustryServices({site,theme,compact}:Props){
 if(!site.services.length)return null;
 const {services:layout}=selectSectionPresentation(site);
 const isClinical=layout==='clinical-index'||layout==='care-editorial';
 const isProject=layout==='project-panels'||layout==='craft-index';
 const heading=site.narrative.servicesHeading;
 const intro=site.narrative.servicesIntro;
 const sectionPad=compact?'py-16 lg:py-20':'py-20 lg:py-28';

 if(layout==='project-panels')return <section id="services" data-services-layout={layout}
  className={`motion-section motion-reveal ${pad} ${sectionPad} ${theme.ink}`}>
  <div className="mx-auto max-w-[1450px]">
   <div className="mb-12 flex flex-col justify-between gap-8 border-b border-white/25 pb-10 lg:flex-row lg:items-end">
    <div><p className="text-xs font-semibold uppercase tracking-[.24em] text-white/65">Outdoor services</p>
     <h2 className="mt-5 max-w-3xl text-[clamp(2.25rem,4.5vw,4.7rem)] font-semibold leading-[1.08] tracking-[-.045em]">{heading}</h2></div>
    <p className="max-w-sm text-base leading-7 text-white/75">{intro}</p>
   </div>
   <div className="grid gap-4 md:grid-cols-2">{site.services.map((service,i)=>
    <article key={service+i} className={`motion-card group flex min-h-[210px] min-w-0 flex-col justify-between border border-white/20 bg-white/[.07] p-7 transition-colors hover:bg-white/[.12] sm:p-9 ${i===0&&site.services.length>3?'md:min-h-[280px]':''}`}>
     <span className="text-xs tracking-[.2em] text-white/55">SERVICE / {index(i)}</span>
     <h3 className="mt-12 max-w-xl break-words text-[clamp(1.4rem,2.8vw,2.4rem)] font-semibold leading-tight tracking-[-.035em]">{service}</h3>
    </article>)}</div>
  </div></section>;

 if(layout==='clinical-index')return <section id="services" data-services-layout={layout}
  className={`motion-section motion-reveal ${pad} ${sectionPad} ${theme.paper}`}>
  <div className="mx-auto max-w-[1360px]">
   <div className="grid items-end gap-8 border-b border-current/20 pb-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
    <div><p className={`text-xs font-semibold uppercase tracking-[.22em] ${theme.eyebrow}`}>Areas of care</p>
     <h2 className="mt-5 max-w-3xl text-[clamp(2.15rem,4vw,4.3rem)] font-semibold leading-[1.07] tracking-[-.04em]">{heading}</h2></div>
    <p className={`max-w-md text-sm leading-7 ${theme.muted}`}>{intro}</p></div>
   <div className="divide-y divide-current/15">{site.services.map((service,i)=>
    <article key={service+i} className="motion-card grid min-w-0 grid-cols-[52px_minmax(0,1fr)] items-center gap-5 py-7 sm:grid-cols-[76px_minmax(0,1fr)_190px] sm:gap-8">
     <span className={`text-xs font-semibold tracking-widest ${theme.eyebrow}`}>{index(i)}</span>
     <h3 className="min-w-0 break-words text-xl font-semibold tracking-[-.025em] sm:text-2xl">{service}</h3>
     <span className={`hidden text-right text-xs sm:block ${theme.muted}`}>Listed care service</span>
    </article>)}</div>
  </div></section>;

 if(layout==='care-editorial'||layout==='craft-index')return <section id="services" data-services-layout={layout}
  className={`motion-section motion-reveal ${pad} ${sectionPad} ${isClinical?theme.base:theme.paper}`}>
  <div className="mx-auto grid max-w-[1450px] gap-12 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:gap-[6vw]">
   <div className="lg:sticky lg:top-10 lg:self-start">
    <p className={`text-xs font-semibold uppercase tracking-[.22em] ${theme.eyebrow}`}>{isProject?'Capabilities':'Services and expertise'}</p>
    <h2 className="mt-5 max-w-xl text-[clamp(2.3rem,4.5vw,4.5rem)] font-semibold leading-[1.06] tracking-[-.045em]">{heading}</h2>
    <p className={`mt-7 max-w-md text-base leading-8 ${theme.muted}`}>{intro}</p>
   </div>
   <div className="border-t border-current/20">{site.services.map((service,i)=>
    <article key={service+i} className="motion-card grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-5 border-b border-current/20 py-7 sm:gap-7 sm:py-9">
     <span className={`pt-2 text-xs font-semibold ${theme.eyebrow}`}>{index(i)}</span>
     <h3 className="min-w-0 break-words text-[clamp(1.3rem,2.2vw,2rem)] font-semibold leading-tight tracking-[-.03em]">{service}</h3>
    </article>)}</div>
  </div></section>;

 return <section id="services" data-services-layout={layout} className={`motion-section motion-reveal ${pad} ${sectionPad} ${theme.base}`}>
  <div className="mx-auto max-w-[1400px]">
   <div className="mb-12 max-w-3xl"><p className={`text-xs font-semibold uppercase tracking-[.22em] ${theme.eyebrow}`}>What we do</p>
    <h2 className="mt-5 text-[clamp(2.15rem,4vw,4.3rem)] font-semibold leading-[1.08] tracking-[-.04em]">{heading}</h2>
    <p className={`mt-5 max-w-xl text-base leading-7 ${theme.muted}`}>{intro}</p></div>
   <div className={`${layout==='advisory-grid'?'grid gap-4 md:grid-cols-2':'border-t border-current/20'}`}>
    {site.services.map((service,i)=><article key={service+i} className={`motion-card min-w-0 ${layout==='advisory-grid'? `flex min-h-[185px] flex-col justify-between rounded-2xl border p-7 sm:p-9 ${theme.border} ${theme.paper}`: 'grid grid-cols-[50px_minmax(0,1fr)] items-center gap-5 border-b border-current/20 py-7'}`}>
     <span className={`text-xs font-semibold tracking-widest ${theme.eyebrow}`}>{index(i)}</span>
     <h3 className="mt-5 break-words text-xl font-semibold leading-snug tracking-[-.03em] sm:text-2xl">{service}</h3>
    </article>)}</div>
  </div></section>;
}

export function IndustryNextSteps({site,theme,compact}:Props){
 const verifiedFeatures=reviewedSiteFeatures(site);
 if(verifiedFeatures.length>=2)return <section data-journey-layout="source-backed" aria-labelledby="reviewed-highlights-title"
  className={'motion-section motion-reveal '+pad+' py-20 lg:py-28 '+theme.paper}>
  <div className="mx-auto max-w-[1450px]">
   <div className="grid gap-12 border-b border-current/15 pb-10 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] lg:gap-20">
    <div><p className={'text-xs font-semibold uppercase tracking-[.22em] '+theme.eyebrow}>From the business</p>
     <h2 id="reviewed-highlights-title" className="mt-5 max-w-2xl text-[clamp(2.15rem,4vw,4rem)] font-semibold leading-[1.07] tracking-[-.045em]">
      A closer look at {site.businessName}.
     </h2></div>
    <p className={'self-end max-w-lg text-base leading-8 '+theme.muted}>
     Details selected from the business's own published information and reviewed for this design concept.
     Availability and current terms should be confirmed directly.
    </p>
   </div>
   <div className="mt-6 grid gap-x-14 lg:grid-cols-2">{verifiedFeatures.map((entry,i)=>
    <article key={entry.id+entry.kind} className="motion-card grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-5 border-b border-current/15 py-9">
     <span className={'pt-1 text-xs font-semibold '+theme.eyebrow}>{index(i)}</span>
     <div className="min-w-0"><p className={'text-[10px] font-bold uppercase tracking-[.2em] '+theme.eyebrow}>{entry.kind}</p>
      <h3 className="mt-3 break-words text-[clamp(1.25rem,2.4vw,2rem)] font-semibold leading-tight tracking-[-.035em]">{entry.label}</h3>
      {entry.detail?<p className={'mt-4 max-w-[56ch] text-sm leading-7 '+theme.muted}>{entry.detail}</p>:null}
      <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className={'mt-5 inline-flex items-center gap-2 text-xs font-semibold underline underline-offset-4 '+theme.eyebrow}>
       See original source <span aria-hidden="true">↗</span>
      </a>
     </div>
    </article>)}</div>
  </div></section>;
 if(!site.services.length||!(site.contact.phone||site.contact.email||site.content.appointmentUrl))return null;
 const {journey}=selectSectionPresentation(site);
 const steps=contactJourney(journey,Boolean(site.content.appointmentUrl));
 const sectionPad=compact?'py-14 lg:py-20':'py-18 lg:py-24';
 const heading=journey==='quote-path'?'From idea to conversation':journey==='care-path'?'Finding the right next step':'Starting a conversation';
 return <section data-journey-layout={journey} aria-labelledby="process-heading" className={`motion-section motion-reveal ${pad} ${sectionPad} ${theme.soft}`}>
  <div className="mx-auto max-w-[1400px]">
   <div className="flex flex-col justify-between gap-6 border-b border-current/15 pb-9 lg:flex-row lg:items-end">
    <div><p className={`text-xs font-semibold uppercase tracking-[.22em] ${theme.eyebrow}`}>Getting started</p>
     <h2 id="process-heading" className="mt-5 max-w-[800px] text-[clamp(2rem,3.7vw,4rem)] font-semibold leading-[1.08] tracking-[-.04em]">{heading}</h2></div>
    <p className={`max-w-sm text-sm leading-7 ${theme.muted}`}>A simple guide to exploring the information provided and contacting the business directly.</p>
   </div>
   <ol className="mt-10 grid min-w-0 gap-4 md:grid-cols-3">{steps.map((step,i)=>
    <li key={step.title} className={`motion-card min-w-0 rounded-2xl border p-6 sm:p-7 ${theme.border} ${theme.paper}`}>
     <span className={`text-xs font-semibold tracking-[.18em] ${theme.eyebrow}`}>{index(i)} / 03</span>
     <h3 className="mt-8 break-words text-[clamp(1.35rem,2vw,1.85rem)] font-semibold leading-tight tracking-[-.03em]">{step.title}</h3>
     <p className={`mt-4 max-w-[30ch] text-sm leading-7 ${theme.muted}`}>{step.description}</p>
    </li>)}</ol>
  </div></section>;
}

type GalleryImage={src:string;alt:string;credit?:string|null;concept:boolean};
export function IndustryGallery({site,theme,images}:{site:SiteBlueprint;theme:Tone;images:GalleryImage[]}){
 if(!images.length)return null;
 const {gallery:layout}=selectSectionPresentation(site);
 const outdoor=site.template==='landscaping';
 const medical=site.template==='medical';
 const eyebrow=outdoor?'Outdoor inspiration':medical?'Visual references':'A closer look';
 const title=outdoor?'Considered spaces, thoughtfully composed.':
  medical?'A calm, considered visual direction.':'Details that define the experience.';
 const intro=outdoor?'Concept directions and approved imagery provide a visual starting point.':
  medical?'Any conceptual imagery is illustrative, not a photograph of the practice.':
  'A mix of approved business photography and clearly marked concepts.';
 const dark=layout==='project-grid';
 const bg=dark?theme.ink:layout==='editorial'?theme.soft:theme.paper;
 const muted=dark?'text-white/70':theme.muted;
 const border=dark?'border-white/15':'border-black/10';
 return <section id="gallery" data-gallery-layout={layout}
  className={`motion-section motion-reveal ${pad} py-20 lg:py-28 ${bg}`}>
  <div className="mx-auto max-w-[1450px]">
   <header className={`mb-10 flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between ${border}`}>
    <div><p className={`text-xs font-semibold uppercase tracking-[.22em] ${dark?'text-white/60':theme.eyebrow}`}>{eyebrow}</p>
     <h2 className="mt-5 max-w-3xl text-[clamp(2.1rem,4.1vw,4.5rem)] font-semibold leading-[1.08] tracking-[-.045em]">{title}</h2></div>
    <p className={`max-w-sm text-sm leading-7 ${muted}`}>{intro}</p>
   </header>
   <div className={`grid gap-5 ${layout==='project-grid'?'md:grid-cols-[minmax(0,1.35fr)_minmax(0,.65fr)]':
     layout==='editorial'?'md:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]':'md:grid-cols-2'}`}>
    {images.map((img,i)=><figure key={img.src+i} className={`motion-media motion-card min-w-0 overflow-hidden ${dark?'bg-white/10':'bg-black/[.025]'}`}>
     <div className={`relative overflow-hidden ${layout==='project-grid'&&i===0?'aspect-[4/3] md:aspect-[3/4]':
       layout==='editorial'&&i===1?'aspect-[4/3]':'aspect-[5/4]'}`}>
      <img src={img.src} alt={img.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.025]"/>
     </div>
     <figcaption className={`flex min-w-0 gap-4 border-t p-4 text-xs leading-6 ${border} ${muted}`}>
      <span className="font-semibold tracking-wider">{index(i)}</span>
      <span>{img.concept?'AI-generated concept visual. Not a photograph of this business.':img.alt}
       {img.credit?' · '+img.credit:''}</span>
     </figcaption>
    </figure>)}</div>
  </div></section>;
}

type HeroImage={src:string;alt:string;credit?:string|null;concept:boolean};
export function IndustryHero({site,theme,photo,compact,standalone}:{
 site:SiteBlueprint;theme:Tone&{main:string;accent:string};photo:HeroImage|null;compact:boolean;standalone:boolean
}){
 const hasServices=site.services.length>0;
 const contact=Boolean(site.content.appointmentUrl||site.contact.email||site.contact.phone);
 const kind=site.template==='landscaping'?'outdoor-showcase':site.template==='medical'?'care-editorial':'studio-brief';
 const isOutdoor=site.template==='landscaping';
 const centered=site.design.composition==='centered';
 const hasPhoto=Boolean(photo);
 const heroMin=compact?'min-h-[490px]':'min-h-[570px]';
 const label=site.eyebrow||'LOCAL BUSINESS';
 const commonCtas=<div className="mt-9 flex flex-wrap items-center gap-5">
  {contact?<a href="#contact" className={`inline-flex min-h-12 items-center rounded-full px-7 py-3 text-sm font-semibold ${theme.main}`}>{site.primaryAction}<span aria-hidden="true" className="ml-3">↗</span></a>:null}
  {hasServices?<a href="#services" className={`inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-8 ${isOutdoor?'decoration-white/50':''}`}>{site.secondaryAction}</a>:null}
 </div>;
 const media=photo?<div className="motion-hero-media motion-media relative min-h-[280px] overflow-hidden rounded-[3px] bg-current/5 sm:min-h-[390px] lg:min-h-0">
  <img src={photo.src} alt={photo.alt} loading="eager" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover"/>
  {photo.concept?<span className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] bg-black/75 px-4 py-2 text-xs leading-5 text-white">AI-generated conceptual visual. Not a photo of this business.</span>:
   photo.credit?<span className="absolute bottom-4 left-4 bg-black/70 px-4 py-2 text-xs text-white">{photo.credit}</span>:null}
 </div>:null;
 if(isOutdoor)return <section id="home" data-hero-layout={kind} data-composition={site.design.composition} className={`motion-section relative isolate overflow-hidden ${theme.ink}`}>
  {hasPhoto&&photo?<img src={photo.src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"/>:null}
  {hasPhoto?<div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/30"/>:null}
  <div className={`relative mx-auto flex max-w-[1650px] flex-col justify-end px-7 py-20 sm:px-12 lg:px-[7vw] lg:py-24 ${heroMin}`}>
   <p className="max-w-lg text-xs font-semibold uppercase tracking-[.24em] text-white/70">{label}</p>
   <h1 className="motion-hero-copy mt-7 max-w-[1000px] break-words text-[clamp(2.75rem,6vw,6rem)] font-semibold leading-[1.04] tracking-[-.055em]">{site.headline||site.businessName}</h1>
   <p className="mt-7 max-w-[660px] text-base leading-8 text-white/85 sm:text-lg">{site.description}</p>
   {commonCtas}
   <div className="mt-14 flex flex-wrap gap-5 border-t border-white/25 pt-5 text-xs text-white/70">
    {site.contact.city?<span>{site.contact.city}</span>:null}
    {hasServices?<span>{site.services.length} listed services</span>:null}
    {photo?.concept?<span>Concept imagery, not actual project photography</span>:null}
   </div>
  </div></section>;
 if(site.template==='medical')return <section id="home" data-hero-layout={kind} data-composition={site.design.composition}
  className={`motion-section relative overflow-hidden ${theme.paper}`}>
  <div className={`mx-auto grid max-w-[1650px] items-stretch ${hasPhoto?'lg:grid-cols-[minmax(0,1.06fr)_minmax(0,.94fr)]':'lg:grid-cols-[minmax(0,1.16fr)_minmax(0,.84fr)]'}`}>
   <div className={`motion-hero-copy flex flex-col justify-center px-7 py-16 sm:px-12 lg:px-[7vw] lg:py-24 ${heroMin}`}>
    <p className={`text-xs font-semibold uppercase tracking-[.24em] ${theme.eyebrow}`}>{label}</p>
    <h1 className="mt-7 max-w-[850px] break-words text-[clamp(2.65rem,4.8vw,5.15rem)] font-semibold leading-[1.06] tracking-[-.055em]">{site.headline||site.businessName}</h1>
    <p className={`mt-7 max-w-[640px] text-base leading-8 sm:text-lg ${theme.muted}`}>{site.description}</p>
    {commonCtas}
    <div className={`mt-12 flex flex-wrap gap-5 border-t border-current/15 pt-5 text-xs ${theme.muted}`}>
     {site.contact.city?<span>{site.contact.city}</span>:null}
     {hasServices?<span>{site.services.length} listed care services</span>:null}
    </div>
   </div>
   {media??<aside className={`hidden flex-col justify-center border-l border-current/10 px-10 py-16 lg:flex ${theme.soft}`}>
    <p className={`text-xs font-semibold uppercase tracking-[.2em] ${theme.eyebrow}`}>Explore care</p>
    <ol className="mt-9 divide-y divide-current/15">{site.services.slice(0,4).map((name,i)=><li key={name+i} className="grid grid-cols-[38px_1fr] items-start gap-3 py-5">
     <span className={`text-xs ${theme.eyebrow}`}>{index(i)}</span><span className="break-words text-lg font-semibold">{name}</span></li>)}</ol>
   </aside>}
  </div></section>;
 return <section id="home" data-hero-layout={kind} data-composition={site.design.composition}
  className={`motion-section relative overflow-hidden ${theme.base}`}>
  <div className={`mx-auto grid max-w-[1650px] ${centered?'lg:grid-cols-1':'lg:grid-cols-[minmax(0,.94fr)_minmax(0,1.06fr)]'}`}>
   <div className={`motion-hero-copy flex flex-col justify-center px-7 py-16 sm:px-12 lg:px-[7vw] lg:py-24 ${heroMin} ${centered?'mx-auto w-full max-w-[1100px] text-center':''}`}>
    <p className={`text-xs font-semibold uppercase tracking-[.24em] ${theme.eyebrow}`}>{label}</p>
    <h1 className="mt-7 max-w-[850px] break-words text-[clamp(2.7rem,5vw,5.5rem)] font-semibold leading-[1.05] tracking-[-.055em]">{site.headline||site.businessName}</h1>
    <p className={`mt-7 max-w-[590px] text-base leading-8 sm:text-lg ${theme.muted} ${centered?'mx-auto':''}`}>{site.description}</p>
    <div className={centered?'flex justify-center':''}>{commonCtas}</div>
   </div>
   {!centered&&(media??<aside className={`flex min-w-0 flex-col justify-end border-t border-current/10 p-7 sm:p-12 lg:border-l lg:border-t-0 ${theme.ink}`}>
    <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">What this business offers</p>
    <div className="mt-10 divide-y divide-white/20">{site.services.slice(0,3).map((name,i)=><div key={name+i} className="flex min-w-0 gap-5 py-5">
     <span className="text-xs text-white/50">{index(i)}</span><p className="min-w-0 break-words text-[clamp(1.1rem,2vw,1.65rem)] font-semibold">{name}</p></div>)}</div>
   </aside>)}
  </div></section>;
}
