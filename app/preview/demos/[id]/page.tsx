import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';
import {requireWorkspace} from '@/lib/workspace';
import {buildSiteBlueprint} from '@/lib/site-blueprint';
import type {DemoCopy,Template} from '@/lib/demo-engine';
import SiteRenderer from '@/components/site-renderer';
import {getMatchedConceptSet} from '@/lib/concept-imagery';

export const dynamic='force-dynamic';

export default async function FullSitePreview({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,organizationId}=await requireWorkspace();
 const {data:demo}=await supabase.from('demo_sites').select('id,business_id,template,draft_content,revision_no')
  .eq('id',id).eq('organization_id',organizationId).maybeSingle();
 if(!demo)notFound();
 const {data:business}=await supabase.from('businesses').select('name,city,phone,contact_email,category')
  .eq('id',demo.business_id).eq('organization_id',organizationId).maybeSingle();
 if(!business)notFound();
 const site=buildSiteBlueprint(demo.template as Template,(demo.draft_content??{}) as Partial<DemoCopy>,{
  name:business.name,city:business.city,phone:business.phone,email:business.contact_email
 });
 const conceptMedia=getMatchedConceptSet(demo.template as Template,business.category,site.services,site.businessName);
 return <main className="relative bg-white">
  <Link href={'/app/demos/'+id} className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full bg-[#07131c]/90 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur hover:bg-[#0d2635]">
   <ArrowLeft size={14}/> Back to editor
  </Link>
  <SiteRenderer site={site} standalone conceptMedia={conceptMedia}/>
 </main>;
}
