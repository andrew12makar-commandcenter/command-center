// Turns active, already-validated packs into a data overlay the generator can read.
// The disclaimer and noindex flag are reapplied here and cannot be cleared.
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {loadRegistry,loadSkillPackDir} from './load.ts';
import {
 INTERNAL_CONCEPT_DISCLAIMER,PREVIEW_ROBOTS,
 type CopyGuidance,type DesignTokens,type LayoutRecipe,type LoadedSkillPack,type MotionPreset,
 type QualityCheck,type SectionTemplate,
} from './schema.ts';
import {SkillPackError,assertPackData} from './validate.ts';

export type CheckResult={id:string;pass:boolean;severity:'block'|'warn';detail:string};
export type AppliedSkillPacks={
 applied:{id:string;version:string;example:boolean}[];
 tokens:DesignTokens;
 sections:SectionTemplate[];
 motion:MotionPreset[];
 layouts:LayoutRecipe[];
 copy:CopyGuidance[];
 checks:QualityCheck[];
 checkResults:CheckResult[];
 disclaimer:typeof INTERNAL_CONCEPT_DISCLAIMER;
 robots:typeof PREVIEW_ROBOTS;
};
export type GeneratorPlanSlice={
 composition:'split-editorial'|'immersive'|'bento'|'service-index'|'centered'|'asymmetric';
 sectionOrder:string[];
 motion:'calm'|'cinematic'|'precise';
 motionPlan:{
  required:true;
  pageEntry:'soft-rise'|'cinematic-wipe'|'precision-reveal';
  sectionReveal:'cascade'|'layered-wipe'|'indexed-rise';
  mediaMotion:'slow-scale'|'masked-reveal'|'depth-shift';
  navigationMotion:'underline-track'|'pill-shift';
  staggerMs:number;
 };
};
export type SkillPackAttachment={
 ids:string[];example:boolean;
 disclaimer:typeof INTERNAL_CONCEPT_DISCLAIMER;
 robots:typeof PREVIEW_ROBOTS;
 tokens:DesignTokens;sections:SectionTemplate[];motion:MotionPreset[];
 layouts:LayoutRecipe[];copy:CopyGuidance[];checks:QualityCheck[];
 checkResults:CheckResult[];
};

const emptyTokens=():DesignTokens=>({color:{},font:{display:'',body:''},radius:{},space:{}});

export function emptyAppliedSkillPacks():AppliedSkillPacks{
 return {applied:[],tokens:emptyTokens(),sections:[],motion:[],layouts:[],copy:[],checks:[],checkResults:[],
  disclaimer:INTERNAL_CONCEPT_DISCLAIMER,robots:PREVIEW_ROBOTS};
}

export function applySkillPacks(packs:LoadedSkillPack[],opts?:{template?:string}):AppliedSkillPacks{
 const template=opts?.template;
 const matching=packs.filter(item=>{
  assertPackData(item.manifest,'manifest');
  assertPackData(item.pack,'pack');
  if(item.pack.copy.some(entry=>entry.disclaimer!==INTERNAL_CONCEPT_DISCLAIMER))
   throw new SkillPackError('a skill pack cannot remove the internal-concept disclaimer');
  return item.manifest.appliesTo.includes('*')||(template!==undefined&&item.manifest.appliesTo.includes(template));
 });
 const applied=emptyAppliedSkillPacks();
 for(const item of matching){
  applied.applied.push({id:item.manifest.id,version:item.manifest.version,example:item.manifest.example});
  applied.tokens={
   color:{...applied.tokens.color,...item.pack.tokens.color},
   font:item.pack.tokens.font,
   radius:{...applied.tokens.radius,...item.pack.tokens.radius},
   space:{...applied.tokens.space,...item.pack.tokens.space},
  };
  applied.sections=mergeById(applied.sections,item.pack.sections);
  applied.motion=mergeById(applied.motion,item.pack.motion);
  applied.layouts=mergeById(applied.layouts,item.pack.layouts);
  applied.copy=mergeById(applied.copy,item.pack.copy);
  applied.checks=mergeById(applied.checks,item.pack.checks);
 }
 applied.disclaimer=INTERNAL_CONCEPT_DISCLAIMER;
 applied.robots=PREVIEW_ROBOTS;
 applied.checkResults=evaluatePackChecks(applied);
 if(JSON.stringify(applied).includes('owner_approved'))
  throw new SkillPackError('refusing to apply a pack that sets owner_approved');
 return applied;
}
function mergeById<T extends {id:string}>(current:T[],incoming:T[]){
 const map=new Map(current.map(item=>[item.id,item]));
 for(const item of incoming)map.set(item.id,item);
 return [...map.values()];
}

export function evaluatePackChecks(applied:AppliedSkillPacks):CheckResult[]{
 const blob=JSON.stringify({tokens:applied.tokens,sections:applied.sections,motion:applied.motion,layouts:applied.layouts,copy:applied.copy});
 return applied.checks.map(check=>{
  let pass=false;
  if(check.rule==='keeps-internal-disclaimer')
   pass=applied.disclaimer===INTERNAL_CONCEPT_DISCLAIMER&&applied.copy.every(entry=>entry.disclaimer===INTERNAL_CONCEPT_DISCLAIMER);
  else if(check.rule==='noindex')pass=applied.robots===PREVIEW_ROBOTS;
  else if(check.rule==='reduced-motion-static')pass=applied.motion.every(preset=>preset.reducedMotion==='static');
  else if(check.rule==='no-owner-approval')pass=!blob.includes('owner_approved')&&!JSON.stringify(applied).includes('owner_approved');
  else if(check.rule==='no-external-url')pass=!/https?:|ftp:|javascript:|data:|file:\/\//i.test(blob);
  else if(check.rule==='motion-duration-cap')pass=applied.motion.every(preset=>preset.durationMs<=(check.maxMs??0));
  else if(check.rule==='section-present')pass=applied.sections.some(section=>section.id===check.sectionId);
  return {id:check.id,pass,severity:check.severity,detail:check.detail};
 });
}

export function applyActiveSkillPacks(opts?:{root?:string;template?:string}):AppliedSkillPacks{
 const root=opts?.root??process.cwd();
 const registryPath=join(root,'skill-packs','registry.json');
 if(!existsSync(registryPath))return emptyAppliedSkillPacks();
 const registry=loadRegistry(registryPath);
 const loaded:LoadedSkillPack[]=[];
 for(const entry of registry.packs){
  if(!entry.active)continue;
  const dir=join(root,'skill-packs',entry.path);
  const pack=loadSkillPackDir(dir);
  if(pack.manifest.id!==entry.id||pack.manifest.version!==entry.version||pack.manifest.example!==entry.example)
   throw new SkillPackError(`registry entry ${entry.id} does not match its manifest`);
  loaded.push(pack);
 }
 return applySkillPacks(loaded,{template:opts?.template});
}

export function mergeSkillPackIntoPlan(applied:AppliedSkillPacks,plan:GeneratorPlanSlice,opts?:{learned?:boolean}){
 const layout=applied.layouts.at(-1);
 const preset=applied.motion.find(item=>item.id===layout?.motionId)??applied.motion.at(-1);
 const learned=opts?.learned===true;
 const next:GeneratorPlanSlice={
  composition:plan.composition,
  sectionOrder:[...plan.sectionOrder],
  motion:plan.motion,
  motionPlan:{...plan.motionPlan},
 };
 const rationale:string[]=[];
 if(applied.applied.length&&!learned){
  if(layout){next.composition=layout.composition;next.sectionOrder=[...layout.sectionOrder];}
  if(preset){
   next.motion=preset.style;
   next.motionPlan={required:true,pageEntry:preset.pageEntry,sectionReveal:preset.sectionReveal,
    mediaMotion:preset.mediaMotion,navigationMotion:preset.navigationMotion,staggerMs:preset.staggerMs};
  }
 }
 if(applied.applied.length){
  const ids=applied.applied.map(item=>`${item.id}${item.example?' (example)':''}`).join(', ');
  rationale.push(learned
   ?`Skill pack ${ids} attached as data. Learned feedback kept the layout. ${INTERNAL_CONCEPT_DISCLAIMER}`
   :`Skill pack ${ids} set composition to ${next.composition} and motion to ${next.motion}. ${INTERNAL_CONCEPT_DISCLAIMER}`);
 }
 const skillPacks:SkillPackAttachment|undefined=applied.applied.length?{
  ids:applied.applied.map(item=>item.id),
  example:applied.applied.some(item=>item.example),
  disclaimer:INTERNAL_CONCEPT_DISCLAIMER,
  robots:PREVIEW_ROBOTS,
  tokens:applied.tokens,sections:applied.sections,motion:applied.motion,layouts:applied.layouts,
  copy:applied.copy,checks:applied.checks,checkResults:applied.checkResults,
 }:undefined;
 if(skillPacks&&JSON.stringify(skillPacks).includes('owner_approved'))
  throw new SkillPackError('refusing to apply a pack that sets owner_approved');
 return {...next,rationale,skillPacks};
}
