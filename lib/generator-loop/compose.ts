// Candidate + verified facts -> page plan. Pure and deterministic. A section is
// produced only when the facts can fill it; nothing is padded or invented, and
// every text fragment records whether it came from a fact or from a template.
import {deriveTraits,palettes,typePairs,type BusinessFacts,type BusinessImage,type DesignCandidate} from './design-space.ts';

export type Fragment={text:string;source:'fact'|'template'};
export type PlanImage={src:string;alt:string;origin:'generated'|'business';disclosure:string|null};
export type PlanCta={label:string;href:string;role:'primary'|'secondary';placement:'header'|'hero'|'section'|'sticky'};
export type SectionKind='hero'|'offer'|'gallery'|'proof'|'team'|'process'|'story'|'faq'|'area'|'visit'|'contact';
export type Reveal='none'|'fade'|'rise'|'indexed'|'wipe';
export type PlanSection={id:string;kind:SectionKind;heading:Fragment;body:Fragment[];items:Fragment[];images:PlanImage[];
 columnsDesktop:number;columnsMobile:number;reveal:Reveal;ctas:PlanCta[]};
export type PagePlan={
 businessId:string;candidate:DesignCandidate;
 sections:PlanSection[];globalCtas:PlanCta[];
 typography:{display:string;body:string;displayScale:number};
 palette:typeof palettes[keyof typeof palettes];
 spacingPx:number;reducedMotion:'static';
 motion:{system:DesignCandidate['motionSystem'];durationMs:number;staggerMs:number};
 imagery:{requested:number;filled:number;rejected:{url:string;reason:string}[]};
};

const orders:Record<DesignCandidate['hierarchy'],SectionKind[]>={
 'offer-first':['offer','gallery','process','proof','team','story','faq','area','visit','contact'],
 'proof-first':['proof','team','offer','process','story','gallery','faq','area','visit','contact'],
 'story-first':['story','offer','gallery','team','proof','process','faq','area','visit','contact'],
 'action-first':['offer','visit','area','process','proof','gallery','team','story','faq','contact'],
};
const slots={none:0,accent:1,balanced:3,immersive:5} as const;
const itemCap={brief:4,standard:8,detailed:24} as const;
const sentenceCap={brief:1,standard:2,detailed:6} as const;
const spacing={compact:56,regular:88,airy:128} as const;
const motionTiming={minimal:{durationMs:300,staggerMs:0},calm:{durationMs:600,staggerMs:90},precise:{durationMs:420,staggerMs:60},cinematic:{durationMs:900,staggerMs:140}} as const;

const fact=(text:string):Fragment=>({text,source:'fact'});
const label=(text:string):Fragment=>({text,source:'template'});
const sentences=(text:string,n:number)=>(text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)??[text]).slice(0,n).join('').trim();
const hostOf=(url:string)=>{try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'');}catch{return null;}};

/** Image permission gate. Business imagery is usable only when a saved
 *  attestation covers exactly that host; everything else is rejected. */
export function permittedBusinessImages(f:BusinessFacts){
 const ok:BusinessImage[]=[],rejected:{url:string;reason:string}[]=[];
 for(const image of f.imagery.businessImages){
  const host=hostOf(image.url);
  if(!host||!/^https:/.test(image.url))rejected.push({url:image.url,reason:'not an https URL'});
  else if(!f.imagery.authorizedHost)rejected.push({url:image.url,reason:'no saved image authorization for this business'});
  else if(host!==f.imagery.authorizedHost.replace(/^www\./,''))rejected.push({url:image.url,reason:`host ${host} is not covered by the authorization for ${f.imagery.authorizedHost}`});
  else if(image.alt.trim().length<5)rejected.push({url:image.url,reason:'missing meaningful alt text'});
  else if(image.quality==='low')rejected.push({url:image.url,reason:'marked low quality by the operator'});
  else ok.push(image);
 }
 return {ok,rejected};
}

// Use the operator's image subject roles rather than arbitrary input ordering.
// Generated concepts may illustrate general sections but never depict staff.
type ImageRole=BusinessImage['role']|'concept';
type TaggedImage=PlanImage&{role:ImageRole};
const heroRoles=['hero','detail','gallery','concept'] as const;
const offerRoles=['detail','gallery','hero','concept'] as const;
const galleryRoles=['gallery','detail','hero','concept'] as const;
const storyRoles=['detail','hero','gallery','concept'] as const;
const teamRoles=['team'] as const;
function allocateImages(f:BusinessFacts,density:DesignCandidate['imageryDensity']){
 const {ok:business,rejected}=permittedBusinessImages(f);
 const generated=f.imagery.generatedAllowed?f.imagery.generated:[];
 const pool:TaggedImage[]=[
  ...business.map(b=>({src:b.url,alt:b.alt,origin:'business' as const,disclosure:null,role:b.role})),
  ...generated.map(g=>({src:g.src,alt:g.alt,origin:'generated' as const,disclosure:g.disclosure,role:'concept' as const})),
 ];
 const requested=slots[density],used=new Set<number>();
 // When a verified staff portrait exists, preserve one immersive slot until
 // the team section, even if it appears after a gallery in the page hierarchy.
 const reserveTeam=density==='immersive'&&Boolean(f.team?.length)&&business.some(b=>b.role==='team');
 const teamPlaced=()=>[...used].some(i=>pool[i].role==='team');
 const capacity=(roles:readonly ImageRole[])=>Math.max(0,requested-used.size-
  (reserveTeam&&!teamPlaced()&&!roles.includes('team')?1:0));
 const remaining=(roles:readonly ImageRole[])=>Math.min(capacity(roles),
  pool.reduce((n,image,i)=>n+(!used.has(i)&&roles.includes(image.role)?1:0),0));
 const take=(n:number,roles:readonly ImageRole[]):PlanImage[]=>{
  const out:PlanImage[]=[];
  if(n<=0)return out;
  for(const role of roles)for(let i=0;i<pool.length&&out.length<n&&capacity([role])>0;i++){
   if(used.has(i)||pool[i].role!==role)continue;
   used.add(i);
   const {role:_subjectRole,...image}=pool[i];
   out.push(image);
  }
  return out;
 };
 return {requested,rejected,remaining,take};
}

function primaryCta(f:BusinessFacts):PlanCta{
 const labels:Record<BusinessFacts['conversion'],string>={book:'Book an appointment',call:f.phone?`Call ${f.phone}`:'Call us',order:'Order online',
  visit:'Plan your visit',donate:'Donate',enroll:'Enroll',quote:'Request a quote',contact:'Get in touch',consult:'Book a consultation'};
 const href=f.conversion==='call'&&f.phone?'tel:'+f.phone.replace(/[^\d+]/g,''):
  f.conversionUrl??(f.phone?'tel:'+f.phone.replace(/[^\d+]/g,''):f.email?'mailto:'+f.email:'#contact');
 return {label:labels[f.conversion],href,role:'primary',placement:'hero'};
}

export function composePage(f:BusinessFacts,c:DesignCandidate):PagePlan{
 const t=deriveTraits(f);
 const cap=itemCap[c.copyDepth],sCap=sentenceCap[c.copyDepth];
 const {requested,rejected,remaining,take}=allocateImages(f,c.imageryDensity);

 const primary=primaryCta(f);
 const secondary:PlanCta|null=f.phone&&!primary.href.startsWith('tel:')?{label:`Call ${f.phone}`,href:'tel:'+f.phone.replace(/[^\d+]/g,''),role:'secondary',placement:'hero'}:
  f.offerings.length?{label:'See what we offer',href:'#offer',role:'secondary',placement:'hero'}:null;
 const heroCtas=[primary,...(c.ctaStructure==='single'||!secondary?[]:[secondary])];
 const reveal=(kind:SectionKind,hasImages:boolean):Reveal=>c.motionSystem==='minimal'?'fade':
  c.motionSystem==='calm'?'rise':c.motionSystem==='precise'?'indexed':hasImages||kind==='hero'?'wipe':'rise';
 const offerCols=c.composition==='bento'?3:c.composition==='service-index'?1:2;

 const heroImages=['immersive','split-editorial','asymmetric'].includes(c.composition)?take(1,heroRoles):[];
 const lead=f.offerings.slice(0,2);
 const sections:PlanSection[]=[{
  id:'top',kind:'hero',
  heading:fact(lead.length===2?`${lead[0]} and ${lead[1]} in ${f.city}`:lead.length?`${lead[0]} in ${f.city}`:f.name),
  body:[fact(sentences(f.about,Math.max(1,sCap-0)))],items:[],images:heroImages,
  columnsDesktop:heroImages.length?2:1,columnsMobile:1,reveal:reveal('hero',heroImages.length>0),ctas:heroCtas,
 }];
 const inline=(href:string,text:string):PlanCta[]=>c.ctaStructure==='section-inline'?[{label:text,href,role:'primary',placement:'section'}]:[];

 for(const kind of orders[c.hierarchy]){
  if(kind==='offer'&&f.offerings.length){
   // A gallery needs two images; an inline offer image only uses a spare one.
   // When the hero carries no image, the first image anchors the offer.
   const left=remaining(offerRoles);
   // A side image needs enough text beside it, or it leaves an empty block.
   const tallEnough=Math.ceil(Math.min(cap,f.offerings.length)/offerCols)>=4;
   const imgs=tallEnough&&((cursor===0&&left>=1&&(c.imageryDensity==='accent'||left>=3))||(c.imageryDensity==='immersive'&&left>=3))?take(1,offerRoles):[];
   sections.push({id:'offer',kind,heading:label('What we offer'),body:[],items:f.offerings.slice(0,cap).map(fact),images:imgs,
    columnsDesktop:offerCols,columnsMobile:offerCols===3&&f.offerings.every(o=>o.length<=22)?2:1,reveal:reveal(kind,imgs.length>0),
    ctas:inline(primary.href,primary.label)});
  }
  if(kind==='gallery'&&(c.imageryDensity==='balanced'||c.imageryDensity==='immersive')){
   const want=Math.min(c.imageryDensity==='immersive'?3:2,remaining(galleryRoles));
   const imgs=want>=2?take(want,galleryRoles):[];
   if(imgs.length>=2)sections.push({id:'gallery',kind,heading:label(imgs.every(i=>i.origin==='generated')?'Visual concepts':imgs.some(i=>i.origin==='generated')?'Photos and visual concepts':t.visualProof?'Recent work':'A closer look'),body:[],items:[],images:imgs,
    columnsDesktop:imgs.length,columnsMobile:1,reveal:reveal(kind,true),ctas:[]});
  }
  if(kind==='proof'&&f.proof?.length)sections.push({id:'proof',kind,heading:label('Credentials and affiliations'),body:[],
   items:f.proof.slice(0,cap).map(fact),images:[],columnsDesktop:Math.min(3,f.proof.length),columnsMobile:1,reveal:reveal(kind,false),ctas:[]});
  if(kind==='team'&&f.team?.length){
   const imgs=c.imageryDensity==='immersive'?take(1,teamRoles):[];
   sections.push({id:'team',kind,heading:label('The people you will work with'),body:[],
    items:f.team.slice(0,cap).map(m=>fact(`${m.name}, ${m.role}`)),images:imgs,columnsDesktop:Math.min(4,f.team.length),columnsMobile:f.team.length>1?2:1,
    reveal:reveal(kind,imgs.length>0),ctas:[]});
  }
  if(kind==='process'&&(f.process?.length??0)>=2)sections.push({id:'process',kind,heading:label('How it works'),body:[],
   items:f.process!.slice(0,cap).map(fact),images:[],columnsDesktop:Math.min(4,f.process!.length),columnsMobile:1,reveal:reveal(kind,false),
   ctas:inline(primary.href,primary.label)});
  if(kind==='story'&&f.about.length>=40&&c.copyDepth!=='brief'){
   const imgs=c.imageryDensity!=='none'&&c.imageryDensity!=='accent'?take(1,storyRoles):[];
   sections.push({id:'story',kind,heading:label(`About ${f.name}`),body:[fact(sentences(f.about,sCap+2))],items:[],images:imgs,
    columnsDesktop:imgs.length?2:1,columnsMobile:1,reveal:reveal(kind,imgs.length>0),ctas:[]});
  }
  if(kind==='faq'&&f.faq?.length)sections.push({id:'faq',kind,heading:label('Questions people ask'),body:[],
   items:f.faq.slice(0,cap).map(x=>fact(`${x.q} ${x.a}`)),images:[],columnsDesktop:1,columnsMobile:1,reveal:reveal(kind,false),ctas:[]});
  if(kind==='area'&&f.serviceArea?.length)sections.push({id:'area',kind,heading:label('Where we work'),body:[],
   items:f.serviceArea.slice(0,cap*2).map(fact),images:[],columnsDesktop:1,columnsMobile:1,reveal:reveal(kind,false),ctas:[]});
  if(kind==='visit'&&(f.address||f.hours?.length))sections.push({id:'visit',kind,heading:label('Visit'),
   body:f.address?[fact(f.address)]:[],items:(f.hours??[]).map(fact),images:[],columnsDesktop:2,columnsMobile:1,reveal:reveal(kind,false),ctas:[]});
  if(kind==='contact'){
   const channels=[...(f.phone?[fact(f.phone)]:[]),...(f.email?[fact(f.email)]:[])];
   sections.push({id:'contact',kind,heading:label(primary.label),body:channels,items:[],images:[],columnsDesktop:1,columnsMobile:1,
    reveal:reveal(kind,false),ctas:[{...primary,placement:'section'}]});
  }
 }
 // Unused images stay unused: density is a ceiling, not a quota to fill.
 const globalCtas:PlanCta[]=[{...primary,placement:'header'},...(c.ctaStructure==='sticky-bar'?[{...primary,placement:'sticky' as const}]:[])];
 return {businessId:f.id,candidate:c,sections,globalCtas,typography:typePairs[c.typography],palette:palettes[c.palette],
  spacingPx:spacing[c.spacing],reducedMotion:'static',motion:{system:c.motionSystem,...motionTiming[c.motionSystem]},
  imagery:{requested,filled:sections.reduce((n,s)=>n+s.images.length,0),rejected}};
}

/** Whether a decision value has content to act on for this business. A rule
 *  is never applied where it would only reshuffle around missing material. */
export function decisionFeasible(f:BusinessFacts,c:DesignCandidate):string|null{
 const lead:Record<DesignCandidate['hierarchy'],boolean>={
  'offer-first':f.offerings.length>0,'proof-first':Boolean(f.proof?.length||f.team?.length),
  'story-first':f.about.length>=40,'action-first':Boolean(f.address||f.hours?.length||f.serviceArea?.length),
 };
 if(!lead[c.hierarchy])return `${c.hierarchy} has no matching content for this business`;
 const images=permittedBusinessImages(f).ok.length+(f.imagery.generatedAllowed?f.imagery.generated.length:0);
 if(c.imageryDensity!=='none'&&images===0)return 'no permitted imagery is available';
 if(c.ctaStructure==='paired'&&!f.phone&&!f.offerings.length)return 'no second verified action for a paired CTA';
 return null;
}
