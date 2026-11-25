import Link from 'next/link';
import SiteRenderer from '@/components/site-renderer';
import {requireWorkspace} from '@/lib/workspace';
import {buildBenchmark,generatorBenchmarks} from '@/lib/generator-benchmarks';
import {getMatchedConceptSet} from '@/lib/concept-imagery';

export const dynamic='force-dynamic';

export default async function GeneratorBenchmarkGallery(){
 await requireWorkspace();
 return <main className="max-w-[1500px]">
  <Link href="/app/demos" className="muted text-sm">← Demo Studio</Link>
  <p className="kicker mt-5">Cross-industry visual QA</p>
  <h1 className="mt-3 text-4xl font-semibold">Generator benchmark gallery</h1>
  <p className="muted mt-3 max-w-3xl text-sm leading-6">{generatorBenchmarks.length} fictional fixtures exercise medical, landscaping, professional-service, food, retail, and holdout layouts. Concept imagery is private and labeled. Passing this gallery does not verify a real company or grant publication rights.</p>
  <div className="mt-10 space-y-16">{generatorBenchmarks.map(item=>{
   const site=buildBenchmark(item);
   return <section key={item.id} aria-labelledby={'benchmark-'+item.id}>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
     <div><p className="kicker">{item.vertical} · {item.holdout?'holdout':'core'}</p><h2 id={'benchmark-'+item.id} className="mt-2 text-2xl font-semibold">{item.name}</h2></div>
     <p className="muted text-xs">{site.design.composition.replaceAll('-',' ')} · {site.design.motion} motion · preflight {site.quality.evaluation.score}/100</p>
    </div>
    <SiteRenderer site={site} conceptMedia={getMatchedConceptSet(item.vertical,item.category,item.services,item.name)}/>
   </section>;
  })}</div>
 </main>;
}
