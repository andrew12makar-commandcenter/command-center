import {NextResponse} from 'next/server';
import {requireWorkspace,validUuid} from '@/lib/workspace';
import {buildSiteBlueprint} from '@/lib/site-blueprint';
import type {DemoCopy,Template} from '@/lib/demo-engine';

export const runtime='nodejs';
export const dynamic='force-dynamic';
// Private, portable specification. It deliberately does NOT deploy, publish,
// scrape, or represent business approval. Use the same renderer with the
// blueprint in a client project after permissions and content review.
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!validUuid(id))return NextResponse.json({error:'Invalid demo ID.'},{status:400});
 const {supabase,organizationId}=await requireWorkspace();
 const {data:demo,error}=await supabase.from('demo_sites')
  .select('id,business_id,template,draft_content,revision_no,status')
  .eq('organization_id',organizationId).eq('id',id).maybeSingle();
 if(error||!demo)return NextResponse.json({error:'Demo not found.'},{status:404});
 const {data:business}=await supabase.from('businesses')
  .select('name,city,phone,contact_email,category')
  .eq('organization_id',organizationId).eq('id',demo.business_id).maybeSingle();
 if(!business)return NextResponse.json({error:'Matching business not found.'},{status:404});
 const blueprint=buildSiteBlueprint(demo.template as Template,
  (demo.draft_content??{}) as Partial<DemoCopy>,{
   name:business.name,city:business.city,phone:business.phone,email:business.contact_email,category:business.category
  });
 return new NextResponse(JSON.stringify({
  exportType:'command-center-private-site-blueprint/v1',
  exportedAt:new Date().toISOString(),
  revision:demo.revision_no??1,
  internalOnly:true,
  blueprint
 },null,2),{
  headers:{
   'Content-Type':'application/json; charset=utf-8',
   'Content-Disposition':`attachment; filename="site-blueprint-${id}.json"`,
   'Cache-Control':'private, no-store',
   'X-Content-Type-Options':'nosniff'
  }
 });
}
