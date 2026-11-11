// Rejects malformed packs, network fetches, executable fragments, fact approval,
// and any disclaimer other than the internal-concept line.
import {
 CHECK_RULES,COMPOSITIONS,GENERATOR_SECTIONS,INTERNAL_CONCEPT_DISCLAIMER,MEDIA_MOTIONS,
 MOTION_STYLES,NAV_MOTIONS,PAGE_ENTRIES,PLACEMENTS,REQUIRED_CHECK_RULES,SECTION_KINDS,
 SECTION_REVEALS,SKILL_PACK_FORMAT,
 type CopyGuidance,type DesignTokens,type LayoutRecipe,type MotionPreset,type QualityCheck,
 type SectionTemplate,type SkillPackBody,type SkillPackManifest,type SkillPackRegistry,
} from './schema.ts';

export class SkillPackError extends Error{
 constructor(message:string){
  super(message);
  this.name='SkillPackError';
 }
}

const kebab=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const version=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const colorHex=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const colorRgba=/^rgba\(\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:0|1|0?\.\d+)\s*\)$/;
const lengthToken=/^\d+(?:\.\d+)?(?:px|rem)$/;
const fontName=/^[A-Za-z0-9][A-Za-z0-9 .'-]{0,60}$/;
const phrase=/^[a-z0-9][a-z0-9 -]{0,40}$/;

export function assertPackData(value:unknown,path='pack'):void{
 if(value===null||typeof value==='boolean')return;
 if(typeof value==='number'){
  if(!Number.isFinite(value))throw new SkillPackError(`${path}: number must be finite`);
  return;
 }
 if(typeof value==='string'){scanString(value,path);return;}
 if(Array.isArray(value)){value.forEach((item,i)=>assertPackData(item,`${path}[${i}]`));return;}
 if(typeof value==='object'){
  for(const [key,child] of Object.entries(value as Record<string,unknown>)){
   scanKey(key,path);
   if(key==='disclaimer'){
    if(child!==INTERNAL_CONCEPT_DISCLAIMER)throw new SkillPackError(`${path}.disclaimer must stay "${INTERNAL_CONCEPT_DISCLAIMER}"`);
    continue;
   }
   assertPackData(child,`${path}.${key}`);
  }
  return;
 }
 throw new SkillPackError(`${path}: unsupported value`);
}

function scanKey(key:string,path:string){
 if(/owner_approved/i.test(key)||/^(?:factStatus|publishReady|robots|src|script|code|eval|module|handler|href|url|fetch)$/i.test(key))
  throw new SkillPackError(`${path}: field ${key} is not allowed in a skill pack`);
 if(/disclaimer/i.test(key)&&key!=='disclaimer')
  throw new SkillPackError(`${path}: field ${key} would change the internal-concept disclaimer`);
 if(/^(?:on[a-z]+)$/i.test(key))throw new SkillPackError(`${path}: field ${key} is not allowed in a skill pack`);
}

function scanString(value:string,path:string){
 const beyondDisclaimer=value.split(INTERNAL_CONCEPT_DISCLAIMER).join('');
 if(/owner_approved/i.test(beyondDisclaimer))throw new SkillPackError(`${path}: a skill pack cannot set owner_approved`);
 if(/endorsed/i.test(beyondDisclaimer)||/internal concept/i.test(beyondDisclaimer))
  throw new SkillPackError(`${path}: text cannot replace the internal-concept disclaimer`);
 if(/https?:|ftp:|javascript:|data:|file:|www\.|\/\//i.test(beyondDisclaimer)||/\burl\s*\(/i.test(beyondDisclaimer))
  throw new SkillPackError(`${path}: external network fetches are not allowed`);
 if(/\b(?:fetch|XMLHttpRequest|WebSocket|import|eval|Function|require)\s*\(/i.test(beyondDisclaimer))
  throw new SkillPackError(`${path}: executable code is not allowed`);
 if(/<script|<\/script|on[a-z]+\s*=/i.test(beyondDisclaimer))
  throw new SkillPackError(`${path}: executable markup is not allowed`);
 if(/\bindex\s*,\s*follow\b/i.test(beyondDisclaimer)||/\bnoindex\s*[:=]\s*false\b/i.test(beyondDisclaimer))
  throw new SkillPackError(`${path}: a skill pack cannot remove noindex`);
}

function isRecord(value:unknown):value is Record<string,unknown>{
 return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
}
function unknownFields(value:Record<string,unknown>,allowed:readonly string[],path:string){
 for(const key of Object.keys(value))if(!allowed.includes(key))throw new SkillPackError(`${path}: unknown field ${key}`);
}
function needRecord(value:unknown,path:string){
 if(!isRecord(value))throw new SkillPackError(`${path}: expected an object`);
 return value;
}
function needString(value:unknown,path:string,max:number){
 if(typeof value!=='string'||!value.trim()||value.length>max)throw new SkillPackError(`${path}: expected text up to ${max} characters`);
 return value;
}
function needId(value:unknown,path:string){
 const text=needString(value,path,64);
 if(!kebab.test(text))throw new SkillPackError(`${path}: expected a lowercase id`);
 return text;
}
function needArray(value:unknown,path:string,max:number){
 if(!Array.isArray(value)||value.length<1||value.length>max)throw new SkillPackError(`${path}: expected 1 to ${max} items`);
 return value;
}
function oneOf<T extends string>(value:unknown,allowed:readonly T[],path:string):T{
 if(typeof value!=='string'||!(allowed as readonly string[]).includes(value))
  throw new SkillPackError(`${path}: expected one of ${allowed.join(', ')}`);
 return value as T;
}
function intIn(value:unknown,min:number,max:number,path:string){
 if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)
  throw new SkillPackError(`${path}: expected an integer from ${min} to ${max}`);
 return value;
}

export function validateManifest(value:unknown):SkillPackManifest{
 assertPackData(value,'manifest');
 const raw=needRecord(value,'manifest');
 unknownFields(raw,['format','id','name','version','example','description','appliesTo','sourceNote'],'manifest');
 if(raw.format!==SKILL_PACK_FORMAT)throw new SkillPackError('manifest.format must be 1');
 const id=needId(raw.id,'manifest.id');
 const name=needString(raw.name,'manifest.name',80);
 const description=needString(raw.description,'manifest.description',400);
 const sourceNote=needString(raw.sourceNote,'manifest.sourceNote',600);
 if(typeof raw.example!=='boolean')throw new SkillPackError('manifest.example must be true or false');
 if(id.startsWith('example-')&&raw.example!==true)throw new SkillPackError('manifest.example must be true when the id starts with example-');
 if(raw.example&&!/example/i.test(`${name} ${description}`))throw new SkillPackError('an example pack must say example in its name or description');
 if(typeof raw.version!=='string'||!version.test(raw.version))throw new SkillPackError('manifest.version must be major.minor.patch');
 if(!Array.isArray(raw.appliesTo)||raw.appliesTo.length<1||raw.appliesTo.length>12)
  throw new SkillPackError('manifest.appliesTo must list 1 to 12 templates');
 const appliesTo=raw.appliesTo.map((item,i)=>{
  if(item==='*')return item;
  return needId(item,`manifest.appliesTo[${i}]`);
 });
 return {format:1,id,name,version:raw.version,example:raw.example,description,appliesTo,sourceNote};
}

function validateTokens(value:unknown):DesignTokens{
 const raw=needRecord(value,'pack.tokens');
 unknownFields(raw,['color','font','radius','space'],'pack.tokens');
 const colorRaw=needRecord(raw.color,'pack.tokens.color');
 const colorEntries=Object.entries(colorRaw);
 if(colorEntries.length<1||colorEntries.length>24)throw new SkillPackError('pack.tokens.color: expected 1 to 24 colors');
 for(const key of ['scene','text','accent'])if(!(key in colorRaw))throw new SkillPackError(`pack.tokens.color.${key} is required`);
 const color:Record<string,string>={};
 for(const [key,item] of colorEntries){
  if(!kebab.test(key))throw new SkillPackError(`pack.tokens.color.${key}: expected a lowercase name`);
  if(typeof item!=='string'||!(colorHex.test(item)||colorRgba.test(item)))
   throw new SkillPackError(`pack.tokens.color.${key}: expected a hex or rgba color`);
  color[key]=item;
 }
 const fontRaw=needRecord(raw.font,'pack.tokens.font');
 unknownFields(fontRaw,['display','body'],'pack.tokens.font');
 const display=needString(fontRaw.display,'pack.tokens.font.display',80);
 const body=needString(fontRaw.body,'pack.tokens.font.body',80);
 if(!fontName.test(display)||!fontName.test(body))throw new SkillPackError('pack.tokens.font names a family, not an address');
 const radius=stringMap(raw.radius,'pack.tokens.radius',lengthToken,'a px or rem length');
 const space=stringMap(raw.space,'pack.tokens.space',lengthToken,'a px or rem length');
 return {color,font:{display,body},radius,space};
}
function stringMap(value:unknown,path:string,pattern:RegExp,label:string){
 const raw=needRecord(value,path);
 const entries=Object.entries(raw);
 if(entries.length>24)throw new SkillPackError(`${path}: expected at most 24 entries`);
 const out:Record<string,string>={};
 for(const [key,item] of entries){
  if(!kebab.test(key))throw new SkillPackError(`${path}.${key}: expected a lowercase name`);
  if(typeof item!=='string'||!pattern.test(item))throw new SkillPackError(`${path}.${key}: expected ${label}`);
  out[key]=item;
 }
 return out;
}
function idList(value:unknown,path:string,min:number,max:number){
 if(!Array.isArray(value)||value.length<min||value.length>max)throw new SkillPackError(`${path}: expected ${min} to ${max} ids`);
 return value.map((item,i)=>needId(item,`${path}[${i}]`));
}

function validateSections(value:unknown):SectionTemplate[]{
 return needArray(value,'pack.sections',24).map((item,index)=>{
  const raw=needRecord(item,`pack.sections[${index}]`);
  unknownFields(raw,['id','kind','slots','template'],`pack.sections[${index}]`);
  return {
   id:needId(raw.id,`pack.sections[${index}].id`),
   kind:oneOf(raw.kind,SECTION_KINDS,`pack.sections[${index}].kind`),
   slots:idList(raw.slots,`pack.sections[${index}].slots`,0,12),
   template:needId(raw.template,`pack.sections[${index}].template`),
  };
 });
}
function validateMotion(value:unknown):MotionPreset[]{
 return needArray(value,'pack.motion',8).map((item,index)=>{
  const path=`pack.motion[${index}]`;
  const raw=needRecord(item,path);
  unknownFields(raw,['id','style','reducedMotion','durationMs','staggerMs','pageEntry','sectionReveal','mediaMotion','navigationMotion'],path);
  if(raw.reducedMotion!=='static')throw new SkillPackError(`${path}.reducedMotion must be static`);
  return {
   id:needId(raw.id,`${path}.id`),
   style:oneOf(raw.style,MOTION_STYLES,`${path}.style`),
   reducedMotion:'static' as const,
   durationMs:intIn(raw.durationMs,0,2000,`${path}.durationMs`),
   staggerMs:intIn(raw.staggerMs,0,400,`${path}.staggerMs`),
   pageEntry:oneOf(raw.pageEntry,PAGE_ENTRIES,`${path}.pageEntry`),
   sectionReveal:oneOf(raw.sectionReveal,SECTION_REVEALS,`${path}.sectionReveal`),
   mediaMotion:oneOf(raw.mediaMotion,MEDIA_MOTIONS,`${path}.mediaMotion`),
   navigationMotion:oneOf(raw.navigationMotion,NAV_MOTIONS,`${path}.navigationMotion`),
  };
 });
}
function validateLayouts(value:unknown,motionIds:Set<string>):LayoutRecipe[]{
 return needArray(value,'pack.layouts',8).map((item,index)=>{
  const path=`pack.layouts[${index}]`;
  const raw=needRecord(item,path);
  unknownFields(raw,['id','composition','sectionOrder','regions','motionId','breakpoints'],path);
  const sectionOrder=idList(raw.sectionOrder,`${path}.sectionOrder`,1,12);
  for(const id of sectionOrder)if(!(GENERATOR_SECTIONS as readonly string[]).includes(id))
   throw new SkillPackError(`${path}.sectionOrder: ${id} is not a generator section`);
  if(!sectionOrder.includes('hero'))throw new SkillPackError(`${path}.sectionOrder must include hero`);
  const regions=needArray(raw.regions,`${path}.regions`,16).map((region,regionIndex)=>{
   const regionRaw=needRecord(region,`${path}.regions[${regionIndex}]`);
   unknownFields(regionRaw,['id','placement'],`${path}.regions[${regionIndex}]`);
   return {id:needId(regionRaw.id,`${path}.regions[${regionIndex}].id`),placement:oneOf(regionRaw.placement,PLACEMENTS,`${path}.regions[${regionIndex}].placement`)};
  });
  let motionId:string|undefined;
  if(raw.motionId!==undefined){
   motionId=needId(raw.motionId,`${path}.motionId`);
   if(!motionIds.has(motionId))throw new SkillPackError(`${path}.motionId does not match a motion preset`);
  }
  let breakpoints:{maxWidth:number;note:string}[]|undefined;
  if(raw.breakpoints!==undefined){
   if(!Array.isArray(raw.breakpoints)||raw.breakpoints.length<1||raw.breakpoints.length>6)
    throw new SkillPackError(`${path}.breakpoints: expected 1 to 6 items`);
   breakpoints=raw.breakpoints.map((breakpoint,breakpointIndex)=>{
    const breakpointRaw=needRecord(breakpoint,`${path}.breakpoints[${breakpointIndex}]`);
    unknownFields(breakpointRaw,['maxWidth','note'],`${path}.breakpoints[${breakpointIndex}]`);
    return {
     maxWidth:intIn(breakpointRaw.maxWidth,320,2400,`${path}.breakpoints[${breakpointIndex}].maxWidth`),
     note:needString(breakpointRaw.note,`${path}.breakpoints[${breakpointIndex}].note`,160),
    };
   });
  }
  return {id:needId(raw.id,`${path}.id`),composition:oneOf(raw.composition,COMPOSITIONS,`${path}.composition`),sectionOrder,regions,motionId,breakpoints};
 });
}
function validateCopy(value:unknown):CopyGuidance[]{
 return needArray(value,'pack.copy',12).map((item,index)=>{
  const path=`pack.copy[${index}]`;
  const raw=needRecord(item,path);
  unknownFields(raw,['id','headingSlots','bodySlots','guidance','forbidden','disclaimer'],path);
  if(raw.disclaimer!==INTERNAL_CONCEPT_DISCLAIMER)throw new SkillPackError(`${path}.disclaimer must stay "${INTERNAL_CONCEPT_DISCLAIMER}"`);
  const guidance=needArray(raw.guidance,`${path}.guidance`,8).map((line,lineIndex)=>needString(line,`${path}.guidance[${lineIndex}]`,240));
  const forbidden=needArray(raw.forbidden,`${path}.forbidden`,12).map((line,lineIndex)=>{
   const text=needString(line,`${path}.forbidden[${lineIndex}]`,40);
   if(!phrase.test(text))throw new SkillPackError(`${path}.forbidden[${lineIndex}]: expected a short topic`);
   return text;
  });
  return {
   id:needId(raw.id,`${path}.id`),
   headingSlots:idList(raw.headingSlots,`${path}.headingSlots`,1,8),
   bodySlots:idList(raw.bodySlots,`${path}.bodySlots`,0,8),
   guidance,forbidden,disclaimer:INTERNAL_CONCEPT_DISCLAIMER,
  };
 });
}
function validateChecks(value:unknown,sectionIds:Set<string>):QualityCheck[]{
 const checks=needArray(value,'pack.checks',24).map((item,index)=>{
  const path=`pack.checks[${index}]`;
  const raw=needRecord(item,path);
  unknownFields(raw,['id','severity','rule','detail','maxMs','sectionId'],path);
  const rule=oneOf(raw.rule,CHECK_RULES,`${path}.rule`);
  const check:QualityCheck={
   id:needId(raw.id,`${path}.id`),
   severity:oneOf(raw.severity,['block','warn'] as const,`${path}.severity`),
   rule,detail:needString(raw.detail,`${path}.detail`,240),
  };
  if(rule==='motion-duration-cap')check.maxMs=intIn(raw.maxMs,1,2000,`${path}.maxMs`);
  else if(raw.maxMs!==undefined)throw new SkillPackError(`${path}.maxMs is only used by motion-duration-cap`);
  if(rule==='section-present'){
   check.sectionId=needId(raw.sectionId,`${path}.sectionId`);
   if(!sectionIds.has(check.sectionId))throw new SkillPackError(`${path}.sectionId does not match a section`);
  }else if(raw.sectionId!==undefined)throw new SkillPackError(`${path}.sectionId is only used by section-present`);
  if((REQUIRED_CHECK_RULES as readonly string[]).includes(rule)&&check.severity!=='block')
   throw new SkillPackError(`${path}: ${rule} must be a blocking check`);
  return check;
 });
 for(const rule of REQUIRED_CHECK_RULES)if(!checks.some(check=>check.rule===rule))
  throw new SkillPackError(`pack.checks must include ${rule}`);
 return checks;
}

export function validatePack(value:unknown):SkillPackBody{
 assertPackData(value,'pack');
 const raw=needRecord(value,'pack');
 unknownFields(raw,['format','tokens','sections','motion','layouts','copy','checks'],'pack');
 if(raw.format!==SKILL_PACK_FORMAT)throw new SkillPackError('pack.format must be 1');
 const sections=validateSections(raw.sections);
 const motion=validateMotion(raw.motion);
 const sectionIds=new Set(sections.map(section=>section.id));
 const motionIds=new Set(motion.map(preset=>preset.id));
 if(sectionIds.size!==sections.length)throw new SkillPackError('pack.sections ids must be unique');
 if(motionIds.size!==motion.length)throw new SkillPackError('pack.motion ids must be unique');
 return {
  format:1,tokens:validateTokens(raw.tokens),sections,motion,
  layouts:validateLayouts(raw.layouts,motionIds),
  copy:validateCopy(raw.copy),
  checks:validateChecks(raw.checks,sectionIds),
 };
}

export function validateRegistry(value:unknown):SkillPackRegistry{
 assertPackData(value,'registry');
 const raw=needRecord(value,'registry');
 unknownFields(raw,['format','packs'],'registry');
 if(raw.format!==SKILL_PACK_FORMAT)throw new SkillPackError('registry.format must be 1');
 if(!Array.isArray(raw.packs)||raw.packs.length>100)throw new SkillPackError('registry.packs must be a list');
 const seen=new Set<string>();
 const packs=raw.packs.map((item,index)=>{
  const path=`registry.packs[${index}]`;
  const entry=needRecord(item,path);
  unknownFields(entry,['id','version','example','active','path'],path);
  const id=needId(entry.id,`${path}.id`);
  if(seen.has(id))throw new SkillPackError(`${path}: duplicate id ${id}`);
  seen.add(id);
  if(typeof entry.version!=='string'||!version.test(entry.version))throw new SkillPackError(`${path}.version must be major.minor.patch`);
  if(typeof entry.example!=='boolean'||typeof entry.active!=='boolean')throw new SkillPackError(`${path}: example and active must be true or false`);
  if(entry.path!==id)throw new SkillPackError(`${path}.path must match the pack id`);
  if(id.startsWith('example-')&&entry.example!==true)throw new SkillPackError(`${path}: example packs stay labeled example`);
  return {id,version:entry.version,example:entry.example,active:entry.active,path:id};
 });
 return {format:1,packs};
}

export function validateReadme(text:string){
 if(text.length>8000)throw new SkillPackError('README.md is too large');
 if(text.includes('\0'))throw new SkillPackError('README.md must be plain text');
 scanString(text,'README.md');
}
