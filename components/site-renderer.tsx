import type {SiteBlueprint} from '@/lib/site-blueprint';
import {Fragment} from 'react';
import {orderRenderableSections,type SectionKey} from '@/lib/site-section-order';
import type {GeneratedConceptSet} from '@/lib/concept-imagery';
import {ArrowRight,ArrowUpRight,CalendarDays,Check,Mail,MapPin,Phone} from 'lucide-react';

const schemes={
 medical:{base:'bg-[#f5f7f5] text-[#102a38]',muted:'text-[#506873]',eyebrow:'text-[#28708a]',border:'border-[#c7d8dc]',ink:'bg-[#0d2b3b] text-white',main:'bg-[#176b86] text-white',soft:'bg-[#e7f0f1]',accent:'bg-[#cfe3e6]',paper:'bg-[#fbfcfa]'},
 landscaping:{base:'bg-[#f5f4ed] text-[#183a2d]',muted:'text-[#5b6f65]',eyebrow:'text-[#4c765b]',border:'border-[#c6d3c5]',ink:'bg-[#173c2e] text-white',main:'bg-[#2f6549] text-white',soft:'bg-[#e4ebe0]',accent:'bg-[#cddbc7]',paper:'bg-[#fbfaf5]'},
 universal:{base:'bg-[#f6f5f1] text-[#1b2938]',muted:'text-[#65717d]',eyebrow:'text-[#54728d]',border:'border-[#ccd5dc]',ink:'bg-[#172b3e] text-white',main:'bg-[#355f7d] text-white',soft:'bg-[#e8edf0]',accent:'bg-[#d2dfe5]',paper:'bg-[#fcfbf8]'}
} as const;

type RendererProps={
 site:SiteBlueprint;
 standalone?:boolean;
 conceptMedia?:GeneratedConceptSet;
};
const number=(value:number)=>String(value).padStart(2,'0');
function SectionLabel({children,className}:{children:string;className:string}){
 return <p className={`text-[10px] font-bold uppercase tracking-[.28em] ${className}`}>{children}</p>;
}

export default function SiteRenderer({site,standalone=false,conceptMedia}:RendererProps){
 const theme=schemes[site.template];
 const composition=site.design.composition||'split-editorial';
 const centered=composition==='centered',immersive=composition==='immersive',bento=composition==='bento',serviceIndex=composition==='service-index';
 // Minimal imagery is an actual presentation constraint, not just a label.
 const allowImages=site.design.imageTreatment!=='minimal';
 const hero=allowImages?site.content.images.find(x=>x.role==='hero'&&x.permission==='approved'):undefined;
 const approvedGallery=(allowImages?site.content.images:[]).filter(x=>(x.role==='gallery'||x.role==='team')&&x.permission==='approved').slice(0,8)
  .map(x=>({src:x.url,alt:x.alt,credit:x.credit,concept:false}));
 const generated=allowImages&&site.content.generatedImageryEnabled?conceptMedia:undefined;
 const gallery=[...approvedGallery,...(generated?[generated.editorial,generated.detail].map(x=>({src:x.src,alt:x.alt,credit:x.disclosure,concept:true})):[])].slice(0,8);
 const displayHero=hero?{src:hero.url,alt:hero.alt,credit:hero.credit,concept:false}:generated?{src:generated.hero.src,alt:generated.hero.alt,credit:generated.hero.disclosure,concept:true}:null;
 const photoHero=Boolean(displayHero)&&(Boolean(generated)||site.content.heroTreatment==='photo-led');
 const contactHref=site.content.appointmentUrl||(site.contact.email?'mailto:'+site.contact.email:site.contact.phone?'tel:'+site.contact.phone.replace(/[^+0-9]/g,''):null);
 const hasContact=Boolean(contactHref),hasServices=site.services.length>0,hasAbout=site.content.about.trim().length>0;
 const compact=site.design.compact;
 const typeClass=site.design.typography==='editorial'?'font-serif':'font-sans';
 const heroGrid=centered?'grid-cols-1':photoHero?'lg:grid-cols-[.88fr_1.12fr]':bento?'lg:grid-cols-[1.18fr_.82fr]':'lg:grid-cols-[1.3fr_.7fr]';
 const sectionSpace=compact?'py-16 lg:py-24':'py-20 lg:py-28';
 const sectionHeading=compact?'text-[clamp(2.2rem,3.5vw,4.1rem)]':'text-[clamp(2.4rem,4vw,4.7rem)]';
 const serviceColumns=site.services.length===4||site.services.length===8?'lg:grid-cols-4':'lg:grid-cols-3';
 const motion=site.design.motionPlan;
 // Keep DOM, keyboard and visible section order synchronized. Previously the
 // site blueprint's stored sectionOrder was ignored in production rendering.
 const servicesSection=hasServices?<section id="services" className={`motion-section motion-reveal px-7 sm:px-12 lg:px-[7vw] ${sectionSpace} ${theme.base}`}><div className="motion-copy grid gap-8 border-b border-current/15 pb-10 lg:grid-cols-[1fr_.48fr] lg:items-end"><div><SectionLabel className={theme.eyebrow}>Services and expertise</SectionLabel><h2 className={`mt-5 max-w-3xl font-semibold leading-[1] tracking-[-.05em] ${sectionHeading}`}>{site.narrative.servicesHeading}</h2></div><p className={`max-w-md text-sm leading-7 lg:justify-self-end ${theme.muted}`}>{site.narrative.servicesIntro}</p></div>
   <div className={`mt-6 grid gap-3 ${serviceIndex?'grid-cols-1':bento&&!compact?'md:grid-cols-2 xl:grid-cols-4':`md:grid-cols-2 ${serviceColumns}`}`}>{site.services.map((service,i)=><article key={service+i} style={{animationDelay:`${i*motion.staggerMs}ms`}} className={`motion-card flex border ${serviceIndex?'min-h-0 items-center gap-8 border-x-0 border-b-0 px-0 py-6':`min-h-[150px] flex-col rounded-[20px] p-6 ${bento&&!compact&&i===0?'md:col-span-2':''}`} ${site.design.cardStyle==='flat'?`border-transparent ${theme.soft}`:`${theme.border} ${theme.paper}`}`}><span className={`text-[10px] font-bold tracking-[.18em] ${theme.eyebrow}`}>{number(i+1)} / {number(site.services.length)}</span><div className={serviceIndex?'':'mt-auto pt-7'}><h3 className="max-w-sm text-lg font-semibold leading-[1.12] tracking-[-.03em]">{service}</h3><p className={`mt-2 text-xs ${theme.muted}`}>Listed service</p></div></article>)}</div>
  </section>:null;
 const aboutSection=hasAbout?<section id="about" className={`motion-section motion-reveal grid gap-12 px-7 sm:px-12 lg:grid-cols-[.72fr_1.28fr] lg:px-[7vw] ${sectionSpace} ${theme.ink}`}><div className="motion-copy"><SectionLabel className="text-white/55">The practice</SectionLabel><h2 className={`mt-5 max-w-xl font-semibold leading-[1] tracking-[-.05em] ${sectionHeading}`}>{site.narrative.aboutHeading}</h2></div><div className="motion-copy lg:border-l lg:border-white/20 lg:pl-[6vw]"><p className="max-w-[780px] whitespace-pre-line text-lg leading-[1.75] text-white/90 sm:text-xl">{site.content.about}</p>{site.content.audience?<p className="mt-8 max-w-xl border-t border-white/20 pt-6 text-sm leading-7 text-white/60">{site.content.audience}</p>:null}</div></section>:null;
 const processSection=hasContact&&hasServices?<section className={`motion-section motion-reveal px-7 sm:px-12 lg:px-[7vw] ${sectionSpace} ${theme.soft}`} aria-labelledby="process-heading"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div className="motion-copy"><SectionLabel className={theme.eyebrow}>Planning your next step</SectionLabel><h2 id="process-heading" className={`mt-5 max-w-xl font-semibold leading-[1] tracking-[-.05em] ${sectionHeading}`}>{site.narrative.processHeading}</h2></div><ol className="grid gap-3 sm:grid-cols-3">{[['Review','Start with the confirmed services listed for this practice.'],['Ask','Contact the practice directly about your needs and availability.'],['Continue',site.content.appointmentUrl?'Use the confirmed appointment request when you are ready.':'Use the confirmed contact path when you are ready.']].map(([title,text],i)=><li style={{animationDelay:`${i*motion.staggerMs}ms`}} className={`motion-card min-h-[180px] rounded-[20px] border p-6 ${theme.border} ${theme.paper}`} key={title}><span className={`text-xs font-bold ${theme.eyebrow}`}>{number(i+1)}</span><h3 className="mt-9 text-lg font-semibold">{title}</h3><p className={`mt-3 text-sm leading-6 ${theme.muted}`}>{text}</p></li>)}</ol></div></section>:null;
 const gallerySection=gallery.length>0?<section id="gallery" className={`motion-section motion-reveal px-7 py-24 sm:px-12 lg:px-[7vw] lg:py-36 ${theme.paper}`}><div className="motion-copy"><SectionLabel className={theme.eyebrow}>Visual story</SectionLabel><div className="mt-6 flex flex-wrap items-end justify-between gap-6"><h2 className="max-w-3xl text-[clamp(2.6rem,5vw,5.4rem)] font-semibold leading-[1] tracking-[-.06em]">A richer sense of place and craft.</h2><p className={`max-w-xs text-sm leading-7 ${theme.muted}`}>{generated?'Generated direction and authorized business imagery work together.':'Only authorized business imagery appears here.'}</p></div></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">{gallery.map((img,i)=><figure key={img.src+i} style={{animationDelay:`${i*motion.staggerMs}ms`}} className={`motion-media motion-card overflow-hidden rounded-[24px] border border-black/5 ${i%3===0?'lg:col-span-7':'lg:col-span-5'}`}><div className="relative aspect-[4/3] overflow-hidden bg-black/5"><img src={img.src} alt={img.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.025]"/></div><figcaption className={`p-4 text-xs leading-6 ${theme.muted}`}>{img.alt}{img.credit?' · '+img.credit:''}</figcaption></figure>)}</div></section>:null;
 const contactSection=hasContact?<section id="contact" className={`motion-section motion-reveal grid gap-12 px-7 sm:px-12 lg:grid-cols-[1.15fr_.85fr] lg:px-[7vw] ${sectionSpace} ${theme.paper}`}><div className="motion-copy"><SectionLabel className={theme.eyebrow}>Contact</SectionLabel><h2 className={`mt-5 max-w-3xl font-semibold leading-[.98] tracking-[-.055em] ${sectionHeading}`}>{site.narrative.contactHeading}</h2>{site.content.appointmentUrl?<a href={site.content.appointmentUrl} target="_blank" rel="noopener noreferrer" className={`mt-9 inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-semibold ${theme.main}`}>{site.primaryAction}<ArrowUpRight size={17}/></a>:null}</div><address className={`motion-copy not-italic lg:border-l lg:pl-[5vw] ${theme.muted}`}><p className="text-xs font-bold uppercase tracking-[.2em]">Direct details</p><div className="mt-8 grid gap-6 text-sm">{site.contact.phone?<a className="flex items-center gap-3 underline underline-offset-5" href={'tel:'+site.contact.phone.replace(/[^+0-9]/g,'')}><Phone size={17}/>{site.contact.phone}</a>:null}{site.contact.email?<a className="flex items-center gap-3 underline underline-offset-5" href={'mailto:'+site.contact.email}><Mail size={17}/>{site.contact.email}</a>:null}{site.contact.city?<span className="flex items-center gap-3"><MapPin size={17}/>{site.contact.city}</span>:null}</div></address></section>:null;
 const sections={services:servicesSection,about:aboutSection,process:processSection,gallery:gallerySection,contact:contactSection};
 const available=(Object.keys(sections) as SectionKey[]).filter(key=>sections[key]!==null);
 const orderedSectionKeys=orderRenderableSections(site.design.sectionOrder,available);
 return <div data-motion-entry={motion.pageEntry} data-motion-reveal={motion.sectionReveal} data-motion-media={motion.mediaMotion} data-motion-navigation={motion.navigationMotion} className={`site-motion motion-${site.design.motion} composition-${composition} overflow-hidden ${standalone?'min-h-screen':'rounded-[22px] border border-black/5 shadow-2xl shadow-black/20'} ${theme.base}`}>
  <header className={`motion-header relative z-20 flex items-center justify-between gap-3 border-b border-black/10 px-5 py-5 sm:gap-5 sm:px-10 lg:px-[6vw] ${theme.paper}`}>
   <a className="max-w-[150px] text-base font-semibold leading-tight tracking-[-.035em] sm:max-w-[340px] sm:text-xl" href="#home">{site.businessName}</a>
   <div className="flex items-center gap-7"><nav className="hidden items-center gap-7 text-[10px] font-bold uppercase tracking-[.17em] md:flex" aria-label="Site navigation">
    {hasServices?<a className="transition-opacity hover:opacity-55" href="#services">Services</a>:null}
    {hasAbout?<a className="transition-opacity hover:opacity-55" href="#about">Practice</a>:null}
	    {gallery.length>0?<a className="transition-opacity hover:opacity-55" href="#gallery">Visuals</a>:null}
    {hasContact?<a className="transition-opacity hover:opacity-55" href="#contact">Contact</a>:null}
   </nav>{hasContact?<a className={`inline-flex whitespace-nowrap items-center gap-2 rounded-full px-4 py-3 text-[11px] font-semibold sm:px-5 sm:text-xs ${theme.main}`} href="#contact">{site.primaryAction} <ArrowUpRight size={14}/></a>:null}</div>
  </header>

	  <section id="home" className={`motion-section relative isolate overflow-hidden ${immersive&&!photoHero?theme.ink:theme.paper}`} data-composition={composition}>
   {immersive&&photoHero&&displayHero?<img src={displayHero.src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"/>:null}
   {immersive&&photoHero?<div className="absolute inset-0 bg-[#07131c]/60"/>:null}
   <div className={`relative grid ${heroGrid} ${standalone?(compact?'min-h-[min(700px,calc(100vh-81px))]':'min-h-[min(820px,calc(100vh-81px))]'):(compact?'lg:min-h-[540px]':'lg:min-h-[640px]')}`}>
    <div className={`motion-hero-copy relative flex flex-col justify-center px-7 sm:px-12 lg:px-[7vw] ${compact?'py-16 lg:py-20':'py-20 lg:py-28'} ${centered?'mx-auto max-w-6xl items-center text-center':''}`}>
     <SectionLabel className={theme.eyebrow}>{site.eyebrow||'A clearer introduction'}</SectionLabel>
     <h1 className={`mt-7 max-w-[900px] font-semibold leading-[.96] tracking-[-.055em] ${compact?'text-[clamp(2.8rem,4.8vw,5.4rem)]':'text-[clamp(3rem,5.4vw,6.2rem)]'} ${typeClass}`}>{site.headline||site.businessName}</h1>
     {site.description?<p className={`mt-8 max-w-[610px] text-base leading-8 sm:text-xl sm:leading-9 ${theme.muted}`}>{site.description}</p>:null}
     <div className={`mt-10 flex flex-wrap items-center gap-5 ${centered?'justify-center':''}`}>{hasContact?<a className={`inline-flex items-center gap-3 rounded-full px-7 py-4 text-sm font-semibold ${theme.main}`} href="#contact">{site.primaryAction}<ArrowUpRight size={17}/></a>:null}{hasServices?<a href="#services" className="inline-flex items-center gap-3 px-2 py-3 text-sm font-semibold">{site.secondaryAction}<ArrowRight size={16}/></a>:null}</div>
     <div className={`mt-14 flex flex-wrap gap-x-8 gap-y-3 border-t border-current/15 pt-6 text-xs ${theme.muted} ${centered?'justify-center':''}`}>
      {site.contact.city?<span className="inline-flex items-center gap-2"><MapPin size={14}/>{site.contact.city}</span>:null}
      {site.content.appointmentUrl?<span className="inline-flex items-center gap-2"><CalendarDays size={14}/>Online appointment request</span>:null}
      {hasServices?<span className="inline-flex items-center gap-2"><Check size={14}/>{site.services.length} confirmed service area{site.services.length===1?'':'s'}</span>:null}
     </div>
    </div>
	    {!immersive&&photoHero&&displayHero?<div className={`motion-hero-media motion-media relative min-h-[430px] overflow-hidden ${site.design.imageTreatment==='framed'?'m-5 rounded-[30px] lg:m-10':''}`}><img src={displayHero.src} alt={displayHero.alt} className="absolute inset-0 h-full w-full object-cover" loading="eager" fetchPriority="high"/><div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"/>{displayHero.credit?<span className={`absolute bottom-5 right-6 max-w-[280px] rounded-full px-4 py-2 text-[10px] font-semibold tracking-wide text-white ${displayHero.concept?'bg-[#07131c]/90':'bg-black/60'}`}>{displayHero.credit}</span>:null}</div>
    :!centered&&!immersive?<aside className={`relative hidden border-l border-black/10 p-10 lg:flex lg:flex-col lg:justify-between ${theme.accent}`} aria-label="Confirmed services at a glance"><div><SectionLabel className="opacity-55">Confirmed focus</SectionLabel><p className="mt-5 max-w-xs text-2xl font-semibold leading-tight tracking-[-.04em]">A faster way to understand the practice before reaching out.</p></div><div>{site.services.slice(0,4).map((service,i)=><div className="grid grid-cols-[40px_1fr] gap-3 border-t border-current/20 py-5" key={service+i}><span className="text-xs opacity-45">{number(i+1)}</span><p className="text-lg font-semibold leading-tight">{service}</p></div>)}</div></aside>:null}
   </div>
  </section>

  {orderedSectionKeys.map(key=><Fragment key={key}>{sections[key]}</Fragment>)}
  <footer className={`flex flex-wrap justify-between gap-4 border-t border-black/10 px-7 py-8 text-xs sm:px-12 lg:px-[7vw] ${theme.paper} ${theme.muted}`}><span>{site.businessName}</span><span>{standalone?`© ${new Date().getFullYear()} ${site.businessName}`:`Private design concept · Blueprint v${site.version}`}</span></footer>
 </div>;
}
