import type {SiteBlueprint} from '@/lib/site-blueprint';
import {ArrowRight,ArrowUpRight,MapPin,Phone,Mail} from 'lucide-react';

// Pure, reusable presentation component. It knows nothing about the CRM,
// Supabase, Lighthouse, or the private editor. Client sites can use the same
// blueprint + renderer only AFTER fact, functionality and asset rights review.
const schemes={
 medical:{
  base:'bg-[#fcfcfb] text-[#12324a]',muted:'text-[#52697a]',
  eyebrow:'text-[#2b7992]',border:'border-[#cadde3]',ink:'bg-[#163b54] text-white',
  main:'bg-[#176b8a] text-white',soft:'bg-[#edf4f5]',accent:'bg-[#cee5ec]',
 },
 landscaping:{
  base:'bg-[#faf9f3] text-[#233b32]',muted:'text-[#5c7064]',
  eyebrow:'text-[#53745b]',border:'border-[#cbd7ca]',ink:'bg-[#234638] text-white',
  main:'bg-[#315f48] text-white',soft:'bg-[#e8eee2]',accent:'bg-[#d0dcc8]',
 },
 universal:{
  base:'bg-[#fbfaf7] text-[#202c3a]',muted:'text-[#687481]',
  eyebrow:'text-[#536d88]',border:'border-[#cdd6de]',ink:'bg-[#25384b] text-white',
  main:'bg-[#365876] text-white',soft:'bg-[#e9eef2]',accent:'bg-[#d4e0e7]',
 }
} as const;
type RendererProps={site:SiteBlueprint;standalone?:boolean};
export default function SiteRenderer({site,standalone=false}:RendererProps){
 const theme=schemes[site.template];
 const isBold=site.design.variant==='bold';
 const hero=site.content.images.find(x=>x.role==='hero'&&x.permission==='approved');
 const gallery=site.content.images.filter(x=>
  (x.role==='gallery'||x.role==='team')&&x.permission==='approved').slice(0,8);
 const photoHero=Boolean(hero)&&site.content.heroTreatment==='photo-led';
 const contactHref=site.content.appointmentUrl||
  (site.contact.email?'mailto:'+site.contact.email:
   site.contact.phone?'tel:'+site.contact.phone.replace(/[^+0-9]/g,''):null);
 const hasContact=Boolean(contactHref);
 const hasServices=site.services.length>0;
 const hasAbout=site.content.about.trim().length>0;
 const bigHeadline=site.headline||site.businessName;
 return <div className={`overflow-hidden ${standalone?'min-h-screen':'rounded-[18px] border border-black/5 shadow-2xl shadow-black/20'} ${theme.base}`}>
  <header className="relative z-10 flex flex-wrap items-center justify-between gap-5 border-b border-black/10 px-7 py-6 sm:px-12 lg:px-16">
   <a className="max-w-[330px] text-xl font-semibold leading-tight tracking-[-.035em] sm:text-2xl" href="#home">{site.businessName}</a>
   <div className="flex flex-wrap items-center gap-5 sm:gap-7">
    <nav className={`flex flex-wrap items-center gap-4 text-[11px] font-semibold uppercase tracking-[.12em] sm:gap-6 ${site.design.prominentNav?'rounded-full border border-current/20 px-5 py-3':''}`} aria-label="Site navigation">
     {hasServices&&<a className="hover:underline" href="#services">Services</a>}
     {hasAbout&&<a className="hover:underline" href="#about">About</a>}
     {gallery.length>0&&<a className="hover:underline" href="#gallery">Gallery</a>}
     {hasContact&&<a className="hover:underline" href="#contact">Contact</a>}
    </nav>
    {hasContact&&<a className={`hidden rounded-full px-5 py-3 text-xs font-semibold sm:inline-flex ${theme.main}`} href="#contact">Get in touch <ArrowUpRight className="ml-2" size={14}/></a>}
   </div>
  </header>
  <section id="home" className={`relative isolate overflow-hidden ${theme.soft}`}>
   <div className={`grid ${photoHero?'lg:min-h-[650px] lg:grid-cols-[.93fr_1.07fr]':'lg:min-h-[560px] lg:grid-cols-[1.45fr_.55fr]'}`}>
    <div className={`relative flex flex-col justify-center px-7 sm:px-12 lg:px-16 ${site.design.compact?'py-14 lg:py-20':'py-20 lg:py-28'}`}>
     <p className={`text-[11px] font-bold uppercase tracking-[.25em] ${theme.eyebrow}`}>{site.eyebrow||'A closer look at the business'}</p>
     <h1 className={`mt-8 max-w-[800px] font-semibold leading-[1.04] tracking-[-.06em] ${isBold?'text-[clamp(3.2rem,6vw,7rem)]':'text-[clamp(3rem,5.1vw,6.25rem)]'}`}>
      {bigHeadline}
     </h1>
     {site.description&&<p className={`mt-7 max-w-[560px] text-base leading-8 sm:text-lg ${theme.muted}`}>{site.description}</p>}
     <div className="mt-10 flex flex-wrap items-center gap-6">
      {hasContact&&<a className={`inline-flex items-center gap-3 rounded-full px-7 py-4 text-sm font-semibold ${theme.main}`} href={site.content.appointmentUrl?'#contact':'#contact'}>
        {site.primaryAction} <ArrowUpRight size={18}/>
      </a>}
      {hasServices&&<a href="#services" className="inline-flex items-center gap-3 text-sm font-semibold underline underline-offset-8">
       {site.secondaryAction}<ArrowRight size={16}/></a>}
      {!hasContact&&!hasServices&&<span className={`text-xs font-semibold ${theme.muted}`}>Content and contact pathways awaiting review</span>}
     </div>
    </div>
    {photoHero&&hero? <div className="relative min-h-[370px] overflow-hidden lg:min-h-full">
      <img src={hero.url} alt={hero.alt} className="absolute inset-0 h-full w-full object-cover" loading="eager" fetchPriority="high"/>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"/>
      {hero.credit&&<span className="absolute bottom-5 right-6 rounded-full bg-black/60 px-3 py-2 text-xs text-white">{hero.credit}</span>}
     </div>:
     <div className={`relative hidden overflow-hidden lg:flex lg:items-end lg:justify-end ${theme.accent}`}>
      <div aria-hidden="true" className="absolute -left-28 top-28 h-96 w-96 rounded-full border-[65px] border-white/40"/>
      <div aria-hidden="true" className="absolute -right-24 -bottom-48 h-[530px] w-[530px] rounded-full border-[1px] border-current/20"/>
      <span aria-hidden="true" className="relative pb-8 pr-10 text-[clamp(7rem,13vw,15rem)] font-semibold tracking-[-.12em] opacity-10">01</span>
     </div>}
   </div>
  </section>
  {hasServices&&<section id="services" className="px-7 py-20 sm:px-12 lg:px-16 lg:py-28">
   <div className="flex flex-wrap items-end justify-between gap-8 border-b border-current/15 pb-10">
    <div><p className={`text-xs font-bold uppercase tracking-[.22em] ${theme.eyebrow}`}>Services & expertise</p>
     <h2 className="mt-4 max-w-[800px] text-[clamp(2.3rem,4vw,4.75rem)] font-semibold leading-[1.08] tracking-[-.05em]">The details that matter.</h2></div>
    <p className={`max-w-xs text-sm leading-7 ${theme.muted}`}>Explore the services listed for this business.</p>
   </div>
   <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{site.services.map((service,i)=><article key={service+i}
    className={`group flex min-h-[220px] flex-col justify-between rounded-[18px] border p-7 sm:p-9 ${theme.border}`}>
    <span className={`text-xs font-semibold ${theme.eyebrow}`}>{String(i+1).padStart(2,'0')} / {String(site.services.length).padStart(2,'0')}</span>
    <h3 className="mt-10 max-w-xs text-2xl font-semibold leading-tight tracking-[-.03em]">{service}</h3>
   </article>)}</div>
  </section>}
  {hasAbout&&<section id="about" className={`grid gap-12 px-7 py-20 sm:px-12 lg:grid-cols-[.8fr_1.2fr] lg:px-16 lg:py-28 ${theme.soft}`}>
    <div><p className={`text-xs font-bold uppercase tracking-[.24em] ${theme.eyebrow}`}>A little more about us</p>
     <h2 className="mt-5 text-[clamp(2.25rem,4vw,4.25rem)] font-semibold leading-[1.08] tracking-[-.05em]">
      More than a first impression.
     </h2></div>
    <div><p className="max-w-[750px] whitespace-pre-line text-lg leading-[1.85] sm:text-xl">{site.content.about}</p>
    {site.content.audience&&<p className={`mt-7 text-sm ${theme.muted}`}>{site.content.audience}</p>}</div>
   </section>}
  {gallery.length>0&&<section id="gallery" className="px-7 py-20 sm:px-12 lg:px-16 lg:py-28">
   <p className={`text-xs font-bold uppercase tracking-[.22em] ${theme.eyebrow}`}>Inside the business</p>
   <div className="mb-10 flex flex-wrap justify-between gap-6"><h2 className="mt-5 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">An authentic look.</h2>
    <p className={`mt-5 max-w-xs text-sm leading-7 ${theme.muted}`}>Curated images approved for this concept.</p></div>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{gallery.map((img,i)=>
    <figure key={img.url+i} className="overflow-hidden rounded-[14px] border border-black/5">
      <div className="relative aspect-[4/3] overflow-hidden bg-black/5"><img src={img.url} alt={img.alt} loading="lazy" className="h-full w-full object-cover"/></div>
      <figcaption className={`p-4 text-xs leading-6 ${theme.muted}`}>{img.alt}{img.credit?' · '+img.credit:''}</figcaption>
    </figure>)}</div>
  </section>}
  {hasContact&&<section id="contact" className={`flex flex-wrap items-end justify-between gap-12 px-7 py-20 sm:px-12 lg:px-16 lg:py-28 ${theme.ink}`}>
   <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[.23em] text-white/65">Next steps</p>
    <h2 className="mt-5 text-[clamp(2.5rem,5vw,5.25rem)] font-semibold leading-[1.07] tracking-[-.055em]">Let's connect.</h2>
    <p className="mt-5 text-base leading-8 text-white/75">Reach the business using the available contact information.</p>
    {site.content.appointmentUrl&&<a href={site.content.appointmentUrl} target="_blank" rel="noopener noreferrer"
      className="mt-9 inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#17354a]">
      {site.primaryAction}<ArrowUpRight size={17}/></a>}
   </div>
   <div className="grid gap-5 text-sm">
    {site.contact.phone&&<a className="flex items-center gap-3 underline underline-offset-4" href={'tel:'+site.contact.phone.replace(/[^+0-9]/g,'')}><Phone size={18}/>{site.contact.phone}</a>}
    {site.contact.email&&<a className="flex items-center gap-3 underline underline-offset-4" href={'mailto:'+site.contact.email}><Mail size={18}/>{site.contact.email}</a>}
    {site.contact.city&&<span className="flex items-center gap-3"><MapPin size={18}/>{site.contact.city}</span>}
   </div>
  </section>}
  <footer className="flex flex-wrap justify-between gap-4 border-t border-black/10 px-7 py-7 text-xs opacity-60 sm:px-12 lg:px-16">
   <span>{site.businessName}</span><span>{standalone?`© ${new Date().getFullYear()} ${site.businessName}`:`Private design concept · Blueprint v${site.version}`}</span>
  </footer>
 </div>;
}
