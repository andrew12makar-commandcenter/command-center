'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace, shortText, validUuid } from '@/lib/workspace';
import { derivePreferences, planGeneration, type DemoCopy, type FeedbackSample, type Template } from '@/lib/demo-engine';
import {businessImageAuthorization,canAutoUseBusinessImage,cleanSiteContent,safeImage,safePublicUrl,type SiteImage,type ImagePermission} from '@/lib/site-blueprint';
import {deriveResearchInsights} from '@/lib/research-intelligence';
import {deriveSiteRedesignReference} from '@/lib/source-redesign-reference';
// These dependency-free guards are shared with the local research runner.
// @ts-expect-error JavaScript module intentionally has no generated declarations.
import {preflightPublicWebsite} from '../../../scripts/local-audit-guard.mjs';
// @ts-expect-error JavaScript module intentionally has no generated declarations.
import {extractCandidates,robotsAllows} from '../../../scripts/site-candidates.mjs';
const issueTags=['layout','visuals','generic_copy','missing_content','navigation','mobile','other'];

export async function rateDemo(form:FormData) {
 const {supabase,organizationId,user}=await requireWorkspace(true);
 const id=shortText(form.get('demo_id'),64), rating=Number(form.get('rating'));
 if(!validUuid(id) || !Number.isInteger(rating) || rating<1 || rating>5) throw new Error('Choose a rating between 1 and 5.');
 const {data:demo}=await supabase.from('demo_sites').select('id,revision_no,template,visual_variant,draft_content')
   .eq('id',id).eq('organization_id',organizationId).single();
 if(!demo) throw new Error('Demo not found.');
 const tags=Array.from(new Set(form.getAll('issues').map(String))).filter(t=>issueTags.includes(t));
 const notes=shortText(form.get('notes'),1200);
 const {error}=await supabase.from('demo_feedback').upsert({
    organization_id:organizationId,demo_id:id,user_id:user.id,
    revision_no:demo.revision_no,template:demo.template,
    visual_variant:demo.draft_content?.design?.variant === 'bold'?'bold':
      demo.draft_content?.design?.variant === 'editorial'?'editorial':demo.visual_variant,
    rating,issue_tags:tags,notes
 },{onConflict:'demo_id,user_id,revision_no'});
 if(error) throw new Error('Cannot save feedback: '+error.message);
 revalidatePath('/app/demos/'+id);revalidatePath('/app/demos');
 redirect('/app/demos/'+id+'?saved=rating');
}

function readImageRows(value:FormDataEntryValue|null,permission:ImagePermission):SiteImage[]{
 const raw=shortText(value,6000);
 const lines=raw.split('\\n').map(x=>x.trim()).filter(Boolean);
 if(lines.length>12)throw new Error('Use up to 12 images per group.');
 return lines.map((line,index)=>{
  const pieces=line.split('|').map(x=>x.trim());
  if(pieces.length<3||pieces.length>4)throw new Error('Image line '+(index+1)+': use image URL | description | source URL | gallery/team/logo.');
  const role=pieces[3]||'gallery';
  if(!['gallery','team','logo'].includes(role))throw new Error('Image line '+(index+1)+': unsupported image role.');
  const image=safeImage({url:pieces[0],alt:pieces[1],sourceUrl:pieces[2],
   permission,role:role as 'gallery'|'team'|'logo'});
  if(!image)throw new Error('Image line '+(index+1)+': a public image URL and a source page URL are required.');
  return image;
 });
}
function checkedUrl(value:FormDataEntryValue|null,label:string):string|null{
 const raw=shortText(value,1600);
 if(!raw)return null;
 const url=safePublicUrl(raw);
 if(!url)throw new Error(label+' must be a public http/https URL.');
 return url;
}

async function boundedHtml(response:Response,maxBytes=1_500_000){
 const declared=Number(response.headers.get('content-length')||0);
 if(declared>maxBytes)throw new Error('Page exceeds the research size limit.');
 const bytes=await response.arrayBuffer();
 if(bytes.byteLength>maxBytes)throw new Error('Page exceeds the research size limit.');
 return new TextDecoder().decode(bytes);
}

/** Private, bounded, same-domain research. Imported material remains unapproved. */
export async function researchBusinessWebsite(form:FormData){
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('demo_id'),64),expectedRevision=Number(form.get('revision_no'));
 if(!validUuid(id)||!Number.isInteger(expectedRevision)||expectedRevision<1)throw new Error('Invalid demo revision.');
 const {data:demo}=await supabase.from('demo_sites').select('id,business_id,draft_content,revision_no')
  .eq('id',id).eq('organization_id',organizationId).maybeSingle();
 if(!demo||demo.revision_no!==expectedRevision)throw new Error('Reload the current demo revision before researching.');
 const {data:business}=await supabase.from('businesses').select('website_url')
  .eq('id',demo.business_id).eq('organization_id',organizationId).maybeSingle();
 const requested=safePublicUrl(business?.website_url);
 if(!requested)redirect('/app/demos/'+id+'?research_error=missing-website');
 const homepage=await preflightPublicWebsite(requested);
 const rootHost=new URL(homepage).hostname;
 const old=(demo.draft_content??{}) as DemoCopy,existing=cleanSiteContent(old.siteContent);
 let robots='';
 try{
  const robotsResponse=await fetch(new URL('/robots.txt',homepage),{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'CommandCenterContentResearch/1.0'}});
  if(robotsResponse.ok)robots=await boundedHtml(robotsResponse,100_000);
 }catch{/* Missing robots file is not permission to leave the approved domain. */}
 const todo=[homepage],visited=new Set<string>(),pages:Array<{url:string;title:string;description:string;headings:string[];excerpts:string[]}>=[];
 const images:SiteImage[]=[];
 while(todo.length&&pages.length<5&&visited.size<12){
  const candidate=todo.shift();
  if(!candidate||visited.has(candidate))continue;
  visited.add(candidate);
  const parsed=new URL(candidate);
  if(parsed.hostname!==rootHost||!robotsAllows(robots,parsed.pathname))continue;
  try{
   const checked=await preflightPublicWebsite(candidate);
   if(new URL(checked).hostname!==rootHost)continue;
   const response=await fetch(checked,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'text/html','User-Agent':'CommandCenterContentResearch/1.0'}});
   if(!response.ok||response.status>=300||!/text\/html/i.test(response.headers.get('content-type')||''))continue;
   const found=extractCandidates(await boundedHtml(response),checked);
   const normalized={url:checked,title:String(found.title||''),description:String(found.description||''),
    themeColor:typeof found.themeColor==='string'?found.themeColor:null,
    headings:(Array.isArray(found.headings)?found.headings:[]).map((h:unknown)=>typeof h==='object'&&h?String((h as {text?:unknown}).text||''):String(h)).filter(Boolean).slice(0,24),
    excerpts:(Array.isArray(found.excerpts)?found.excerpts:[]).map(String).slice(0,8)};
   pages.push(normalized);
   for(const raw of (Array.isArray(found.images)?found.images:[]).slice(0,30)){
    const source=typeof raw==='object'&&raw&&'sourceUrl' in raw?String((raw as {sourceUrl?:unknown}).sourceUrl||checked):checked;
    const image=safeImage({...raw,permission:canAutoUseBusinessImage(existing.imageAuthorization,source)?'approved':'reference_only'});
    if(image&&!images.some(x=>x.url===image.url))images.push(image);
   }
   for(const link of (Array.isArray(found.links)?found.links:[]).slice(0,12))
    if(typeof link==='string'&&!visited.has(link)&&!todo.includes(link)&&todo.length<15)todo.push(link);
  }catch{/* Individual page failures do not turn candidates into facts. */}
 }
 if(!pages.length)redirect('/app/demos/'+id+'?research_error=no-readable-pages');
 const researchInsights=deriveResearchInsights(pages);
 const updated:DemoCopy={...old,siteContent:cleanSiteContent({...existing,pages:undefined,
  researchPages:pages,researchInsights,researchedAt:new Date().toISOString(),images:[...existing.images,...images]})};
 const {error}=await supabase.rpc('save_demo_revision',{p_demo_id:id,p_expected_revision:expectedRevision,p_content:updated});
 if(error)throw new Error('Could not save live research: '+error.message);
 revalidatePath('/app/demos/'+id);
 redirect('/app/demos/'+id+'?saved=live-research');
}

/** Apply operator-reviewed source candidates to the next private revision. */
export async function applyReviewedResearch(form:FormData){
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('demo_id'),64),expectedRevision=Number(form.get('revision_no'));
 if(!validUuid(id)||!Number.isInteger(expectedRevision)||expectedRevision<1)throw new Error('Invalid demo revision.');
 const selected=new Set(form.getAll('insight').map(value=>shortText(value,80)).filter(Boolean));
 if(selected.size<1||selected.size>30)throw new Error('Select between 1 and 30 sourced candidates.');
 const {data:demo}=await supabase.from('demo_sites').select('id,business_id,draft_content,revision_no')
  .eq('id',id).eq('organization_id',organizationId).maybeSingle();
 if(!demo||demo.revision_no!==expectedRevision)throw new Error('Reload the current demo revision before applying research.');
 const existing=(demo.draft_content??{}) as DemoCopy,content=cleanSiteContent(existing.siteContent);
 const matched=content.researchInsights.filter(item=>selected.has(item.id));
 if(matched.length!==selected.size)throw new Error('One or more research candidates no longer exist.');
 const researchInsights=content.researchInsights.map(item=>({...item,status:selected.has(item.id)?'reviewed' as const:item.status}));
 const sourcedServices=matched.filter(item=>item.kind==='service').map(item=>item.label);
 const services=[...(existing.services??[]),...sourcedServices]
  .filter((value,index,all)=>all.findIndex(item=>item.toLowerCase()===value.toLowerCase())===index).slice(0,8);
 const moduleKinds=matched.map(item=>item.kind).filter(kind=>['team','gallery','trust','faq'].includes(kind));
 const baseOrder=existing.generationSpec?.sectionOrder??['hero','services','about','contact'];
 const sectionOrder=[...baseOrder];
 for(const kind of moduleKinds)if(!sectionOrder.includes(kind))sectionOrder.splice(Math.max(2,sectionOrder.length-1),0,kind);
 const reviewedContent=cleanSiteContent({...content,researchInsights});
 // Use the company's existing site and *reviewed* source candidates as design
 // references. Previously accepted feedback always wins over source heuristics.
 const reference=deriveSiteRedesignReference(reviewedContent,demo.template as Template,services);
 const canReplan=(existing.design?.feedbackCount??0)===0;
 const updatedSpec=existing.generationSpec?{
  ...existing.generationSpec,sectionOrder,
  composition:canReplan?reference.recommendedComposition:existing.generationSpec.composition,
  imageTreatment:canReplan?reference.recommendedImageTreatment:existing.generationSpec.imageTreatment,
  rationale:[...existing.generationSpec.rationale.slice(0,10),
   canReplan?`Reviewed source-backed design direction: ${reference.recommendedComposition} (${reference.approvedImages} approved images; ${reference.unapprovedImageReferences} awaiting permission)`:
    'Preserved explicit design feedback over source-site suggestions'].slice(0,12)
 }:existing.generationSpec;
 const updated:DemoCopy={...existing,services,siteContent:reviewedContent,generationSpec:updatedSpec};
 const {error}=await supabase.rpc('save_demo_revision',{p_demo_id:id,p_expected_revision:expectedRevision,p_content:updated});
 if(error)throw new Error('Could not apply reviewed research: '+error.message);
 revalidatePath('/app/demos/'+id);
 redirect('/app/demos/'+id+'?saved=research-applied');
}

// Import explicit public-site research as references ONLY. Owner permission
// and facts are separately reviewed in the content editor before any display.
export async function importSiteResearch(form:FormData){
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('demo_id'),64);
 const expectedRevision=Number(form.get('revision_no'));
 if(!validUuid(id)||!Number.isInteger(expectedRevision)||expectedRevision<1)throw new Error('Invalid demo revision.');
 const uploaded=form.get('researchFile');
 if(!(uploaded instanceof File)||uploaded.size<20||uploaded.size>800_000)
  throw new Error('Choose the local site-research JSON (up to 800 KB).');
 let json:unknown;
 try{json=JSON.parse(await uploaded.text());}catch{throw new Error('Research file is not valid JSON.');}
 if(!json||typeof json!=='object')throw new Error('Unsupported research data.');
 const report=json as Record<string,unknown>;
 if(report.kind!=='command-center-site-research/v1')
  throw new Error('Not a Command Center site-research export.');
 const {data:demo,error:loadError}=await supabase.from('demo_sites')
  .select('id,business_id,draft_content,revision_no')
  .eq('organization_id',organizationId).eq('id',id).maybeSingle();
 if(loadError||!demo)throw new Error('Demo record unavailable.');
 if(report.business_id!==demo.business_id)throw new Error('Research belongs to a different CRM business.');
 const {data:business}=await supabase.from('businesses').select('website_url')
  .eq('organization_id',organizationId).eq('id',demo.business_id).maybeSingle();
 if(!business?.website_url)throw new Error('Business website is missing from CRM.');
 const base=safePublicUrl(business.website_url);
 const scanned=safePublicUrl(report.website_url);
 if(!base||!scanned)throw new Error('Invalid website evidence.');
 const host=(url:string)=>new URL(url).hostname.toLowerCase().replace(/^www\./,'');
 if(host(base)!==host(scanned))throw new Error('Research website does not match the CRM website.');
 const old=(demo.draft_content??{}) as DemoCopy;
 const existing=cleanSiteContent(old.siteContent);
 const raw=Array.isArray(report.pages)?report.pages:[];
 if(raw.length<1||raw.length>5)throw new Error('Expected 1–5 researched pages.');
 const pages=[];const assets:SiteImage[]=[];
 for(const page of raw){
  if(!page||typeof page!=='object')continue;
  const p=page as Record<string,unknown>;
  const source=safePublicUrl(p.url);
  if(!source||host(source)!==host(base))throw new Error('Research contains a page outside the approved business domain.');
  pages.push({
   url:source,
   title:typeof p.title==='string'?p.title.slice(0,170):'',
   description:typeof p.description==='string'?p.description.slice(0,280):'',
   themeColor:typeof p.themeColor==='string'?p.themeColor:null,
   headings:Array.isArray(p.headings)?p.headings.slice(0,24).map((h:unknown)=>{
    const label=h&&typeof h==='object'?(h as Record<string,unknown>).text:h;
    return typeof label==='string'?label.slice(0,140):'';
   }).filter(Boolean):[],
   excerpts:Array.isArray(p.excerpts)?p.excerpts.slice(0,7).map((e:unknown)=>typeof e==='string'?e.slice(0,230):'').filter(Boolean):[]
  });
  if(Array.isArray(p.images))for(const image of p.images.slice(0,35)){
   if(!image||typeof image!=='object')continue;
   const candidate=image as Record<string,unknown>;
   const item=safeImage({
    url:String(candidate.url||''),alt:String(candidate.alt||'Business image reference').slice(0,180),
    sourceUrl:source,role:'gallery',permission:canAutoUseBusinessImage(existing.imageAuthorization,source)?'approved':'reference_only'
   });
   if(item)assets.push(item);
   if(assets.length>=80)break;
  }
 }
 const updatedSite=cleanSiteContent({
  ...existing,
  researchPages:pages,researchedAt:typeof report.generated_at==='string'?report.generated_at:new Date().toISOString(),
  researchInsights:deriveResearchInsights(pages),images:[...existing.images,...assets]
 });
 const updated:DemoCopy={...old,siteContent:updatedSite};
 const {error}=await supabase.rpc('save_demo_revision',{
  p_demo_id:id,p_expected_revision:expectedRevision,p_content:updated
 });
 if(error)throw new Error('Could not save sourced research: '+error.message);
 revalidatePath('/app/demos/'+id);
 redirect('/app/demos/'+id+'?saved=research');
}

export async function saveDemoCopy(form:FormData) {
 const {supabase,organizationId}=await requireWorkspace(true);
 const id=shortText(form.get('demo_id'),64);
 const revision=Number(form.get('revision_no'));
 if(!validUuid(id)||!Number.isInteger(revision)||revision<1) throw new Error('Invalid demo/version.');
 const {data:demo}=await supabase.from('demo_sites').select('id,business_id,draft_content,revision_no')
   .eq('id',id).eq('organization_id',organizationId).single();
 if(!demo) throw new Error('Demo not found.');
 const old=demo.draft_content as DemoCopy;
 const heroUrl=checkedUrl(form.get('heroImageUrl'),'Hero image');
 const heroSource=checkedUrl(form.get('heroImageSourceUrl'),'Hero image source');
 if(heroUrl&&!heroSource)throw new Error('Add the original source page for the hero image.');
 const appointmentUrl=checkedUrl(form.get('appointmentUrl'),'Appointment link');
 const sourceUrl=checkedUrl(form.get('siteSourceUrl'),'Business information source');
 const galleryApproved=form.get('galleryRightsApproved')==='on';
 const images:SiteImage[]=[
  ...readImageRows(form.get('imageReferences'),'reference_only'),
  ...readImageRows(form.get('approvedGallery'),galleryApproved?'approved':'reference_only')
 ];
 if(heroUrl&&heroSource){
  const hero=safeImage({url:heroUrl,sourceUrl:heroSource,role:'hero',
   alt:'Business hero photography',permission:form.get('heroImageApproved')==='on'?'approved':'reference_only'});
  if(!hero)throw new Error('Invalid hero image.');
  images.unshift(hero);
 }
 const rawFactStatus=shortText(form.get('factStatus'),32);
 const factStatus=['researched','owner_approved'].includes(rawFactStatus)?
  rawFactStatus:'unreviewed';
 const {data:business}=await supabase.from('businesses').select('website_url')
  .eq('id',demo.business_id).eq('organization_id',organizationId).maybeSingle();
 const authorizeBusinessImages=form.get('businessImagesAuthorized')==='on';
 const businessSite=safePublicUrl(business?.website_url);
 if(authorizeBusinessImages&&!businessSite)throw new Error('Add a verified independent business website before authorizing its images.');
 const siteContent=cleanSiteContent({
   ...old.siteContent,
  about:shortText(form.get('siteAbout'),1100),
  audience:shortText(form.get('siteAudience'),200),
  sourceUrl,appointmentUrl,
   factStatus,
   heroTreatment:shortText(form.get('heroTreatment'),20),
   generatedImageryEnabled:form.get('generatedImageryEnabled')==='on',
   imageAuthorization:businessImageAuthorization(businessSite,authorizeBusinessImages),
   images
 });

 // Editing copy is human-controlled. No automated claims, testimonials, phone numbers or credentials.
 const content:DemoCopy={
   ...old,
   brand:shortText(form.get('brand'),140),
   eyebrow:shortText(form.get('eyebrow'),130),
   headline:shortText(form.get('headline'),200),
   description:shortText(form.get('description'),800),
   primaryAction:shortText(form.get('primaryAction'),65),
   secondaryAction:shortText(form.get('secondaryAction'),65),
   heroImageUrl:heroUrl??undefined,
   siteContent,
   services:shortText(form.get('services'),1000).split('\n').map(x=>x.trim()).filter(Boolean).slice(0,6),
 };
 if(!content.brand||!content.headline) throw new Error('Business name and headline are required.');
 const {error}=await supabase.rpc('save_demo_revision',{
   p_demo_id:id,p_expected_revision:revision,p_content:content,
 });
 if(error) throw new Error('Could not save version: '+error.message);
 revalidatePath('/app/demos/'+id);revalidatePath('/app/demos'); 
 redirect('/app/demos/'+id+'?saved=copy');
}

// Apply the accumulated personal preference profile to this draft as a new
// version. Past copy stays unchanged; only supported design controls adapt.
export async function applyLearnedPreferences(form:FormData) {
 const {supabase,organizationId,user}=await requireWorkspace(true);
 const id=shortText(form.get('demo_id'),64);
 const expectedRevision=Number(form.get('revision_no'));
 if(!validUuid(id)||!Number.isInteger(expectedRevision)||expectedRevision<1) throw new Error('Invalid draft.');
 const {data:demo,error:loadError}=await supabase.from('demo_sites')
   .select('id,template,revision_no,draft_content,visual_variant')
   .eq('id',id).eq('organization_id',organizationId).maybeSingle();
 if(loadError||!demo) throw new Error('The demo could not be loaded.');
 const {data:ratings,error:feedbackError}=await supabase.from('demo_feedback')
   .select('demo_id,user_id,template,visual_variant,rating,issue_tags,notes,created_at')
   .eq('organization_id',organizationId).eq('user_id',user.id)
   .order('created_at',{ascending:false}).limit(200);
 if(feedbackError) throw new Error('Your feedback could not be loaded.');
 const preferences=derivePreferences((ratings??[]) as FeedbackSample[],demo.template as Template,id);
 const existing=(demo.draft_content??{}) as DemoCopy;
 const generationSpec=planGeneration(existing.brand||'Business',demo.template as Template,preferences);
 const updated={...existing,design:preferences,generationSpec};
 if(JSON.stringify({design:existing.design??{},generationSpec:existing.generationSpec??{}})===JSON.stringify({design:preferences,generationSpec})) {
    redirect('/app/demos/'+id+'?saved=unchanged');
 }
 const {error}=await supabase.rpc('save_demo_revision',{
   p_demo_id:id,p_expected_revision:expectedRevision,p_content:updated,
 });
 if(error) throw new Error('Could not save learned revision: '+error.message);
 revalidatePath('/app/demos/'+id);
 redirect('/app/demos/'+id+'?saved=adapted');
}
