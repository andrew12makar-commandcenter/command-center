import type {SiteBlueprint} from '@/lib/site-blueprint';
import {Fragment} from 'react';
import {IndustryServices,IndustryNextSteps,IndustryGallery,IndustryHero} from '@/components/site-industry-sections';
import {orderRenderableSections,type SectionKey} from '@/lib/site-section-order';
import type {GeneratedConceptSet} from '@/lib/concept-imagery';
import {selectSiteMedia} from '@/lib/site-media-selection';
import {classifyIndustry} from '@/lib/business-classification';
import {ArrowRight,ArrowUpRight,CalendarDays,Check,Mail,MapPin,Menu,Phone} from 'lucide-react';

const schemes={
 medical:{base:'bg-[#f5f7f5] text-[#102a38]',muted:'text-[#4a5f6a]',eyebrow:'text-[#236479]',border:'border-[#c7d8dc]',ink:'bg-[#0d2b3b] text-white',main:'bg-[#176b86] text-white',soft:'bg-[#e7f0f1]',accent:'bg-[#cfe3e6]',paper:'bg-[#fbfcfa]'},
 landscaping:{base:'bg-[#f5f4ed] text-[#183a2d]',muted:'text-[#4f5e56]',eyebrow:'text-[#386149]',border:'border-[#c6d3c5]',ink:'bg-[#173c2e] text-white',main:'bg-[#2f6549] text-white',soft:'bg-[#e4ebe0]',accent:'bg-[#cddbc7]',paper:'bg-[#fbfaf5]'},
 universal:{base:'bg-[#f6f5f1] text-[#1b2938]',muted:'text-[#55606b]',eyebrow:'text-[#45627a]',border:'border-[#ccd5dc]',ink:'bg-[#172b3e] text-white',main:'bg-[#355f7d] text-white',soft:'bg-[#e8edf0]',accent:'bg-[#d2dfe5]',paper:'bg-[#fcfbf8]'}
} as const;

type RendererProps={
 site:SiteBlueprint;
 standalone?:boolean;
 conceptMedia?:GeneratedConceptSet;
};
const number=(value:number)=>String(value).padStart(2,'0');
function SectionLabel({children,className}:{children:string;className:string}){
 return <p className={`text-xs font-bold uppercase tracking-[.28em] sm:text-[10px] ${className}`}>{children}</p>;
}

export default function SiteRenderer({site,standalone=false,conceptMedia}:RendererProps){
 const theme=schemes[site.template];
 const composition=site.design.composition||'split-editorial';
 const centered=composition==='centered',immersive=composition==='immersive',bento=composition==='bento',serviceIndex=composition==='service-index';
 // The same role/rights-aware selection is used for internal demos and exports.
 const generated=site.design.imageTreatment!=='minimal'&&site.content.generatedImageryEnabled?conceptMedia:undefined;
 const {displayHero,gallery}=selectSiteMedia(site,generated);
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
 // "Practice" is clinical vocabulary; a plumber or restaurant is not a practice.
 const aboutNav=site.template==='medical'?'Practice':'About';
 const aboutLabel=site.template==='medical'?'The practice':site.template==='landscaping'?'The company':'About';
 const sector=classifyIndustry(site.businessName,site.category).sector;
 const servicesNav=sector==='food'?'Menu':sector==='retail'?'Shop':'Services';
 const navLinks=[hasServices&&{href:'#services',label:servicesNav},hasAbout&&{href:'#about',label:aboutNav},
  gallery.length>0&&{href:'#gallery',label:'Visuals'},hasContact&&{href:'#contact',label:'Contact'}]
  .filter((x):x is {href:string;label:string}=>Boolean(x));
 // Keep DOM, keyboard and visible section order synchronized. Previously the
 // site blueprint's stored sectionOrder was ignored in production rendering.
 const servicesSection=hasServices?<IndustryServices site={site} theme={theme} compact={compact}/>:null;
 const aboutSection=hasAbout?<section id="about" className={`motion-section motion-reveal grid gap-12 px-7 sm:px-12 lg:grid-cols-[.72fr_1.28fr] lg:px-[7vw] ${sectionSpace} ${theme.ink}`}><div className="motion-copy"><SectionLabel className="text-white/70">{aboutLabel}</SectionLabel><h2 className={`mt-5 max-w-xl font-semibold leading-[1] tracking-[-.05em] ${sectionHeading}`}>{site.narrative.aboutHeading}</h2></div><div className="motion-copy lg:border-l lg:border-white/20 lg:pl-[6vw]"><p className="max-w-[780px] whitespace-pre-line text-lg leading-[1.75] text-white/90 sm:text-xl">{site.content.about}</p>{site.content.audience?<p className="mt-8 max-w-xl border-t border-white/20 pt-6 text-sm leading-7 text-white/60">{site.content.audience}</p>:null}</div></section>:null;
 const processSection=hasContact&&hasServices?<IndustryNextSteps site={site} theme={theme} compact={compact}/>:null;
 const gallerySection=gallery.length>0?<IndustryGallery site={site} theme={theme} images={gallery}/>:null;
 const contactSection=hasContact?<section id="contact" className={`motion-section motion-reveal grid gap-12 px-7 sm:px-12 lg:grid-cols-[1.15fr_.85fr] lg:px-[7vw] ${sectionSpace} ${theme.paper}`}><div className="motion-copy"><SectionLabel className={theme.eyebrow}>Contact</SectionLabel><h2 className={`mt-5 max-w-3xl font-semibold leading-[.98] tracking-[-.055em] ${sectionHeading}`}>{site.narrative.contactHeading}</h2>{site.content.appointmentUrl?<a href={site.content.appointmentUrl} target="_blank" rel="noopener noreferrer" className={`mt-9 inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-semibold ${theme.main}`}>{site.primaryAction}<ArrowUpRight size={17}/></a>:null}</div><address className={`motion-copy not-italic lg:border-l lg:pl-[5vw] ${theme.muted}`}><p className="text-xs font-bold uppercase tracking-[.2em]">Direct details</p><div className="mt-8 grid gap-6 text-sm">{site.contact.phone?<a className="flex min-h-11 items-center gap-3 underline underline-offset-5" href={'tel:'+site.contact.phone.replace(/[^+0-9]/g,'')}><Phone size={17}/>{site.contact.phone}</a>:null}{site.contact.email?<a className="flex min-h-11 items-center gap-3 underline underline-offset-5" href={'mailto:'+site.contact.email}><Mail size={17}/>{site.contact.email}</a>:null}{site.contact.city?<span className="flex items-center gap-3"><MapPin size={17}/>{site.contact.city}</span>:null}</div></address></section>:null;
 const sections={services:servicesSection,about:aboutSection,process:processSection,gallery:gallerySection,contact:contactSection};
 const available=(Object.keys(sections) as SectionKey[]).filter(key=>sections[key]!==null);
 const orderedSectionKeys=orderRenderableSections(site.design.sectionOrder,available);
 // overflow-clip (not overflow-hidden): a hidden-overflow wrapper becomes the
 // scroll container for CSS view() timelines, freezing every scroll reveal at a
 // position-dependent opacity instead of tracking the visitor's viewport.
 return <div data-motion-entry={motion.pageEntry} data-motion-reveal={motion.sectionReveal} data-motion-media={motion.mediaMotion} data-motion-navigation={motion.navigationMotion} className={`site-motion motion-${site.design.motion} composition-${composition} overflow-clip ${standalone?'min-h-screen':'rounded-[22px] border border-black/5 shadow-2xl shadow-black/20'} ${theme.base}`}>
  <header className={`motion-header relative z-20 flex items-center justify-between gap-3 border-b border-black/10 px-5 py-5 sm:gap-5 sm:px-10 lg:px-[6vw] ${theme.paper}`}>
   <a className="max-w-[150px] py-2 text-base font-semibold leading-tight tracking-[-.035em] sm:max-w-[340px] sm:text-xl" href="#home">{site.businessName}</a>
   <div className="flex items-center gap-3 sm:gap-7"><nav className="hidden items-center gap-7 text-[10px] font-bold uppercase tracking-[.17em] md:flex" aria-label="Site navigation">
    {navLinks.map(link=><a key={link.href} className="transition-opacity hover:opacity-55" href={link.href}>{link.label}</a>)}
   </nav>{hasContact?<a className={`inline-flex whitespace-nowrap items-center gap-2 rounded-full px-4 py-3 text-xs font-semibold sm:px-5 ${theme.main}`} href="#contact">{site.primaryAction} <ArrowUpRight size={14}/></a>:null}
   {/* Small screens previously had no section navigation at all. A native
       disclosure needs no client JavaScript and works in standalone exports. */}
   {navLinks.length>1?<details className="site-mobile-nav relative md:hidden"><summary aria-label="Open site menu" className={`flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border ${theme.border}`}><Menu size={18} aria-hidden="true"/></summary>
    <nav aria-label="Site navigation" className={`absolute right-0 top-[calc(100%+10px)] z-30 grid min-w-[200px] rounded-2xl border p-2 shadow-xl shadow-black/10 ${theme.border} ${theme.paper}`}>
     {navLinks.map(link=><a key={link.href} className="rounded-xl px-4 py-3 text-sm font-semibold" href={link.href}>{link.label}</a>)}
    </nav></details>:null}</div>
  </header>

	  <IndustryHero site={site} theme={theme} photo={displayHero} compact={compact} standalone={standalone}/>


  {orderedSectionKeys.map(key=><Fragment key={key}>{sections[key]}</Fragment>)}
  <footer className={`flex flex-wrap justify-between gap-4 border-t border-black/10 px-7 py-8 text-xs sm:px-12 lg:px-[7vw] ${theme.paper} ${theme.muted}`}><span>{site.businessName}</span><span>{standalone?`© ${new Date().getFullYear()} ${site.businessName}`:`Private design concept · Blueprint v${site.version}`}</span></footer>
 </div>;
}
