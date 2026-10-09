import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace';
import { createDemoBatch } from './actions';

type Business={id:string;name:string;city:string|null};
type Demo={id:string;template:string;status:string;created_at:string;business_id:string};
export default async function DemoStudio({searchParams}:{searchParams:Promise<{created?:string}>}){
  const {supabase,organizationId}=await requireWorkspace();
  const [{data:businesses},{data:demos,error}]=await Promise.all([
    supabase.from('businesses').select('id,name,city').eq('organization_id',organizationId).order('name').limit(100),
    supabase.from('demo_sites').select('id,template,status,created_at,business_id').eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(50)
  ]);
  const byId=new Map(((businesses??[]) as Business[]).map(b=>[b.id,b]));
  const {created}=await searchParams;
  return <main>
    <p className="kicker">Proposal accelerator</p><h1 className="mt-3 text-4xl font-semibold">Demo Studio</h1>
    <p className="muted mt-3 max-w-3xl">Three reusable layouts, one data-backed draft generator. Every preview stays private until a separate share-link authorization layer is ready.</p>
    {created&&<p className="mt-4 text-sm text-cyan-200">{created} new demo drafts created.</p>}
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <section className="panel p-7"><h2 className="text-xl font-semibold">Generate a batch</h2>
        <p className="muted mt-3 text-sm">Select up to 20 businesses, choose a layout and create consistent drafts for upcoming field visits.</p>
        <form action={createDemoBatch} className="mt-5">
          <label className="text-sm">Template<select name="template" className="mt-2">
            <option value="landscaping">Home & landscaping services</option>
            <option value="medical">Medical / dental</option>
            <option value="universal">Professional services / universal</option>
          </select></label>
          <label className="mt-4 block text-sm">Design direction
            <select name="visual_variant" className="mt-2">
              <option value="auto">Auto: use feedback after enough reviews</option>
              <option value="editorial">Editorial / minimal</option>
              <option value="bold">Bold / high contrast</option>
            </select>
          </label>
          <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-[#273b48] p-3">
            {(businesses??[]).map(b=><label key={b.id} className="flex cursor-pointer items-center gap-3 border-b border-[#273b48] p-3 text-sm">
              <input type="checkbox" className="h-4 w-4 shrink-0" name="business_ids" value={b.id}/>
              <span>{b.name} <small className="muted block">{b.city??'Location pending'}</small></span>
            </label>)}
            {!businesses?.length&&<p className="muted p-3 text-sm">Add a CRM business first.</p>}
          </div>
          <button className="btn mt-5" type="submit">Create selected demo drafts</button>
        </form>
      </section>
      <section className="panel p-7"><p className="kicker">Reusable templates</p><h2 className="mt-3 text-xl font-semibold">Client-ready structure, factual content pending</h2>
        <div className="mt-5 space-y-4">
          {[
            ['Home services','Landscape, contractor and field service layouts with prominent service and quote pathways.'],
            ['Medical / dental','Patient-first appointment and contact pathways without fabricated clinical credentials.'],
            ['Professional / general','Adaptable company identity, services, location, contact and next action.'],
          ].map(([title,body])=><div className="rounded-xl border border-[#273b48] p-4" key={title}><strong>{title}</strong><p className="muted mt-2 text-sm">{body}</p></div>)}
        </div>
      </section>
    </div>
    <section className="panel mt-7 overflow-x-auto">
      <div className="flex items-center justify-between p-6"><h2 className="text-xl font-semibold">Your saved drafts</h2><span className="muted text-xs">Latest 50</span></div>
      {error&&<p className="p-5 text-red-300">Could not retrieve demo drafts.</p>}
      <table><thead><tr><th>Company</th><th>Layout</th><th>Status</th><th>Created</th><th>Preview</th></tr></thead><tbody>
        {((demos??[]) as Demo[]).map(d=><tr key={d.id}><td>{byId.get(d.business_id)?.name??'Business record'}</td><td>{d.template}</td><td>{d.status}</td><td>{new Date(d.created_at).toLocaleDateString('en-US')}</td><td><Link href={'/app/demos/'+d.id} className="text-cyan-300 underline">Open draft ↗</Link></td></tr>)}
      </tbody></table>
      {!demos?.length&&!error&&<p className="muted p-6 text-sm">No drafts yet. Select real prospects above or generate one from its CRM record.</p>}
    </section>
    <p className="muted mt-4 text-xs">All previews are private and authenticated. Ratings and revision history are recorded separately; after at least five distinct ratings per variant, the automatic design recommendation may adapt. Public sharing is not yet enabled.</p>
  </main>;
}
