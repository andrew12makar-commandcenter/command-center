import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

type DemoCopy={brand?:string;eyebrow?:string;headline?:string;description?:string;services?:string[];disclaimer?:string;category?:string};
const styleByTemplate:Record<string,{root:string;hero:string;label:string;cta:string;line:string}>={
  landscaping:{root:'bg-[#e8eae3] text-[#19372f]',hero:'bg-[#214638] text-[#fafaf0]',label:'text-[#3b7159]',cta:'bg-[#dae7ab] text-[#1b3b28]',line:'border-[#8caa9a]'},
  medical:{root:'bg-[#f0f7fa] text-[#193d50]',hero:'bg-[#d6e9f0] text-[#173d52]',label:'text-[#27758f]',cta:'bg-[#174e6a] text-white',line:'border-[#adc9d4]'},
  universal:{root:'bg-[#f4f0e8] text-[#202937]',hero:'bg-[#202937] text-white',label:'text-[#486486]',cta:'bg-[#c5d6ed] text-[#202937]',line:'border-[#d0d1d2]'},
};

export default async function DemoPreview({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {supabase,organizationId}=await requireWorkspace();
  const {data:demo,error}=await supabase.from('demo_sites').select('*')
    .eq('id',id).eq('organization_id',organizationId).maybeSingle();
  if(error||!demo) notFound();
  const copy=demo.draft_content as DemoCopy;
  const style=styleByTemplate[demo.template]??styleByTemplate.universal;
  return <main>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><Link className="muted text-sm" href="/app/demos">← Demo Studio</Link>
      <p className="kicker mt-4">Private design preview · {demo.template}</p>
      <h1 className="mt-2 text-2xl font-semibold">{copy.brand??'Untitled draft'}</h1></div>
      <Link className="btn" href={'/app/leads/'+demo.business_id}>View source CRM record →</Link>
    </div>
    <p className="mt-5 rounded-xl border border-amber-700/30 bg-amber-950/20 p-4 text-sm text-amber-200">
      INTERNAL CONCEPT ONLY. Do not show as an authorized client website. Business claims and services are placeholders pending confirmation.
    </p>
    <div className={`mt-6 overflow-hidden rounded-[26px] ${style.root}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-6 sm:px-14">
        <div className="max-w-sm text-lg font-bold tracking-tight">{copy.brand??'Business name'}</div>
        <div className="flex gap-7 text-xs font-semibold uppercase tracking-wider opacity-75"><span>Overview</span><span>Services</span><span>Contact</span></div>
      </div>
      <section className={`relative overflow-hidden px-8 py-20 sm:px-14 sm:py-28 ${style.hero}`}>
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border border-current opacity-10"></div>
        <div className="absolute -bottom-40 right-10 h-80 w-80 rounded-full border border-current opacity-10"></div>
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[.22em] opacity-75">{copy.eyebrow??'Local business'}</p>
          <h2 className="mt-7 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">{copy.headline??'A better digital first impression.'}</h2>
          <p className="mt-7 max-w-xl text-base leading-8 opacity-80">{copy.description??'Content to confirm with the client.'}</p>
          <span className={`mt-10 inline-flex rounded-xl px-6 py-4 text-sm font-semibold ${style.cta}`}>Contact information pending →</span>
        </div>
      </section>
      <section className="px-8 py-20 sm:px-14">
        <p className={`text-xs font-semibold uppercase tracking-widest ${style.label}`}>Built around your services</p>
        <h3 className="mt-4 text-3xl font-semibold">What customers need to know</h3>
        <div className="mt-12 grid gap-5 md:grid-cols-3">{(copy.services??[]).map((service,i)=><div key={i} className={`rounded-2xl border ${style.line} p-8`}>
          <span className="text-xs opacity-60">0{i+1}</span><h4 className="mt-10 text-xl font-semibold">{service}</h4>
          <p className="mt-3 text-sm leading-6 opacity-60">Confirm this offering and client-approved details before publishing.</p>
        </div>)}</div>
      </section>
      <footer className={`border-t ${style.line} px-8 py-8 text-xs opacity-75 sm:px-14`}>
        {copy.disclaimer??'Concept design only. Not an authorized business website.'}
      </footer>
    </div>
  </main>;
}
