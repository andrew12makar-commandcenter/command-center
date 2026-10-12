import {NextRequest,NextResponse} from 'next/server';
import {requireWorkspace,validUuid} from '@/lib/workspace';
import {publicWebsite} from '@/lib/website-intelligence';

export const runtime='nodejs';
export const dynamic='force-dynamic';
// This manifest makes NO browser requests. It merely exports a manually
// selected queue; running it requires a separate local terminal confirmation.
export async function GET(request:NextRequest){
 if(process.env.NODE_ENV!=='development')
  return NextResponse.json({error:'Local audits are available only in development mode.'},{status:404});
 const p=request.nextUrl.searchParams;
 const ids=p.getAll('business_id');
 if(p.get('confirm')!=='yes'||ids.length<1||ids.length>10||
    new Set(ids).size!==ids.length||!ids.every(validUuid))
  return NextResponse.json({error:'Confirm and select 1–10 unique CRM businesses.'},{status:400});
 const {supabase,organizationId,role}=await requireWorkspace();
 if(!['owner','admin','editor'].includes(role))
  return NextResponse.json({error:'This account cannot approve research audits.'},{status:403});
 const {data,error}=await supabase.from('businesses')
  .select('id,name,website_url').eq('organization_id',organizationId).in('id',ids);
 if(error||!data||data.length!==ids.length)
  return NextResponse.json({error:'Could not retrieve every selected CRM business.'},{status:400});
 const byId=new Map(data.map(row=>[row.id,row]));
 const businesses=[];
 try{
  for(const id of ids){
   const record=byId.get(id);
   if(!record?.website_url)throw Error('Missing website.');
   businesses.push({
    id,name:String(record.name).slice(0,200),
    website_url:publicWebsite(record.website_url)
   });
  }
 }catch{
  return NextResponse.json({error:'A selected business lacks a valid independent website. Fix the CRM record before exporting.'},{status:422});
 }
 const now=Date.now();
 const manifest={
  kind:'command-center-local-audit/v1',
  generated_at:new Date(now).toISOString(),
  expires_at:new Date(now+60*60_000).toISOString(),
  businesses
 };
 return new NextResponse(JSON.stringify(manifest,null,2),{
  status:200,headers:{
   'Content-Type':'application/json; charset=utf-8',
   'Content-Disposition':'attachment; filename="command-center-audit-queue.json"',
   'Cache-Control':'private, no-store, max-age=0',
   'X-Content-Type-Options':'nosniff'
  }
 });
}
