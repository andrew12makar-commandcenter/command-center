// Scoped preference model built from interpreted feedback signals and from
// the loop's own measured reverts.
//
// - Explicit rules keep the scope the reviewer gave them: project (default),
//   trait ("for businesses that rely on trust"), industry, or global.
// - Induced rules generalise. The same signal from two or more projects in one
//   industry becomes an industry rule. Across industries it becomes a trait
//   rule conditioned on the most informative trait every evidence business
//   shared (the rarest such trait in the reviewed population), or a global
//   rule when they share nothing remarkable. Contradicting evidence blocks it.
// - Evaluation constraints: when a change is reverted because a measurement
//   regressed, the loop records "avoid this value for businesses with this
//   trait", which later prunes candidates before they are rendered.
// - Resolution: project > industry > trait > global. A more specific rule on
//   the same decision shadows a conflicting broader one. Hard rules are gates.
// This is structured preference retrieval, not model training.
import {designDimensions,isDimension,ordinalDimensions,ordinalStep,traitKeys,unmarkedTrait,type BusinessTraits,type DesignCandidate,type Dimension,type DimensionValue,type TraitKey} from './design-space.ts';
import type {Scope,Signal,SignalOp,TraitCondition} from './feedback-interpreter.ts';
import {stableHash} from './stable-hash.ts';

export type Rule={
 id:string;scope:Scope;scopeKey:string;dimension:Dimension;
 op:Exclude<SignalOp,'keep'>;value:string|null;
 weight:number;evidence:string[];projects:string[];industries:string[];induced:boolean;
 /** Traits a business must have for the rule to apply. */
 when:TraitCondition|null;
 source:'feedback'|'evaluation';
};
export type PreferenceModel={rules:Rule[];version:string};
export type ResolveContext={projectKey:string;industry:string;traits?:BusinessTraits|null};
export type ActiveRules={rules:Rule[];shadowed:Rule[]};

const opposite:Record<Rule['op'],Rule['op'][]>={prefer:['avoid','forbid'],avoid:['prefer','require'],require:['avoid','forbid'],
 forbid:['prefer','require'],more:['less'],less:['more']};
const combine=(ws:number[])=>1-ws.reduce((p,w)=>p*(1-Math.max(0,Math.min(1,w))),1);
const conditionKey=(w:TraitCondition|null)=>w?Object.entries(w).sort(([a],[b])=>a<b?-1:1).map(([k,v])=>`${k}=${v}`).join('&'):'';
/** A trait value every supporter shares and no contradicting business has.
 *  Among several, the most common in the population wins (the broadest rule
 *  the evidence still justifies). */
function separatingCondition(support:Signal[],against:Signal[],population:BusinessTraits[]):TraitCondition|null{
 const pro=[...new Map(support.filter(s=>s.traits).map(s=>[s.projectKey,s.traits!])).values()];
 const con=[...new Map(against.filter(s=>s.traits).map(s=>[s.projectKey,s.traits!])).values()];
 if(pro.length<2||!con.length)return null;
 let best:{k:TraitKey;v:string|boolean;freq:number}|null=null;
 for(const k of traitKeys){
  const v=pro[0][k];
  if(!pro.every(t=>t[k]===v)||con.some(t=>t[k]===v))continue;
  const freq=population.filter(t=>t[k]===v).length/Math.max(1,population.length);
  if(!best||freq>best.freq)best={k,v,freq};
 }
 return best?{[best.k]:best.v}:null;
}
const ruleId=(r:Pick<Rule,'scope'|'scopeKey'|'dimension'|'op'|'value'|'when'|'source'>)=>
 stableHash([r.scope,r.scopeKey,r.dimension,r.op,r.value,conditionKey(r.when),r.source]);

/** The rarest remarkable trait value shared by every evidence business. */
function informativeCondition(sig:Signal[],population:BusinessTraits[]):TraitCondition|null{
 const ts=[...new Map(sig.filter(s=>s.traits).map(s=>[s.projectKey,s.traits!])).values()];
 if(!ts.length||ts.length<sig.map(s=>s.projectKey).filter((v,i,a)=>a.indexOf(v)===i).length)return null;
 let best:{k:TraitKey;v:string|boolean;freq:number}|null=null;
 for(const k of traitKeys){
  const v=ts[0][k];
  if(!ts.every(t=>t[k]===v)||unmarkedTrait[k]===v)continue;
  const freq=population.filter(t=>t[k]===v).length/Math.max(1,population.length);
  if(freq>=.8)continue; // nearly everyone has it: explains nothing
  if(!best||freq<best.freq)best={k,v,freq};
 }
 return best?{[best.k]:best.v}:null;
}

export function buildPreferenceModel(signals:Signal[],constraints:Rule[]=[]):PreferenceModel{
 type Base=Pick<Rule,'scope'|'scopeKey'|'dimension'|'op'|'value'|'when'>;
 const groups=new Map<string,{base:Base;ws:number[];sig:Signal[]}>();
 const add=(scope:Scope,scopeKey:string,s:Signal,weight:number)=>{
  const op:Rule['op']=s.op==='keep'?'prefer':s.op;
  const base:Base={scope,scopeKey,dimension:s.dimension,op,value:s.value,when:scope==='trait'?s.condition??null:null};
  const key=stableHash(base);
  const g=groups.get(key)??{base,ws:[],sig:[]};
  g.ws.push(weight);g.sig.push(s);groups.set(key,g);
 };
 const population=[...new Map(signals.filter(s=>s.traits).map(s=>[s.projectKey,s.traits!])).values()];
 // Praise is worth less than a complaint: it confirms, it does not redirect.
 for(const s of signals)add(s.scope,s.scopeKey,s,s.op==='keep'?s.strength*.6:s.strength);

 // Induction. A relative rule ("fewer images") generalises; a concrete
 // complaint about one page's value generalises only as that value.
 const explicit=[...groups.values()];
 const contradicted=(dimension:Dimension,op:Rule['op'],value:string|null,filter:(s:Signal)=>boolean)=>
  signals.some(s=>filter(s)&&s.dimension===dimension&&opposite[op].includes(s.op==='keep'?'prefer':s.op)&&(s.value===value||value===null||s.value===null));
 const byIndustry=new Map<string,Map<string,Signal[]>>();
 for(const g of explicit){
  if(g.base.scope==='global'||g.base.scope==='trait')continue;
  for(const s of g.sig){
   const k=stableHash([g.base.dimension,g.base.op,g.base.value]);
   const m=byIndustry.get(s.industry)??new Map<string,Signal[]>();
   m.set(k,[...(m.get(k)??[]),s]);byIndustry.set(s.industry,m);
  }
 }
 const crossIndustry=new Map<string,{industries:Set<string>;sig:Signal[]}>();
 for(const [industry,m] of byIndustry)for(const [k,sig] of m){
  const projects=new Set(sig.map(s=>s.projectKey));
  const s0=sig[0];const op:Rule['op']=s0.op==='keep'?'prefer':s0.op;
  const c=crossIndustry.get(k)??{industries:new Set<string>(),sig:[]};
  c.industries.add(industry);c.sig.push(...sig);crossIndustry.set(k,c);
  if(projects.size>=2&&!contradicted(s0.dimension,op,s0.value,s=>s.industry===industry)){
   const key=stableHash({scope:'industry',scopeKey:industry,k,induced:true});
   groups.set(key,{base:{scope:'industry',scopeKey:industry,dimension:s0.dimension,op,value:s0.value,when:null},
    ws:[combine(sig.map(s=>s.strength))*.8],sig});
  }
 }
 for(const [k,c] of crossIndustry){
  // Global rules need breadth: three industries, or two when every signal is
  // a complaint (praise confirms one page; it says less about all pages).
  const praiseOnly=c.sig.some(s=>s.op==='keep');
  if(c.industries.size<(praiseOnly?3:2))continue;
  const s0=c.sig[0];const op:Rule['op']=s0.op==='keep'?'prefer':s0.op;
  // Contradicting evidence does not end learning: if one trait value is shared
  // by every supporting business and by none of the contradicting ones, the
  // rule holds for that trait ("fewer photos when visual proof is not central").
  const against=signals.filter(s=>s.dimension===s0.dimension&&opposite[op].includes(s.op==='keep'?'prefer':s.op)&&
   (s.value===s0.value||s0.value===null||s.value===null));
  const when=against.length?separatingCondition(c.sig,against,population):informativeCondition(c.sig,population);
  if(against.length&&!when)continue;
  const key=stableHash({scope:when?'trait':'global',k,induced:true});
  groups.set(key,{base:{scope:when?'trait':'global',scopeKey:when?conditionKey(when):'*',dimension:s0.dimension,op,value:s0.value,when},
   ws:[combine(c.sig.map(s=>s.strength))*.6],sig:c.sig});
 }
 const rules:Rule[]=[];
 const seen=new Map<string,Rule>();
 for(const g of groups.values()){
  const id=ruleId({...g.base,source:'feedback'});
  const induced=g.sig.some(s=>s.scope!==g.base.scope);
  const prev=seen.get(id);
  const rule:Rule={...g.base,source:'feedback',id,weight:Math.round(combine(g.ws)*1000)/1000,
   evidence:[...new Set(g.sig.map(s=>s.eventId))].sort(),projects:[...new Set(g.sig.map(s=>s.projectKey))].sort(),
   industries:[...new Set(g.sig.map(s=>s.industry))].sort(),induced};
  if(prev){prev.weight=Math.max(prev.weight,rule.weight);prev.evidence=[...new Set([...prev.evidence,...rule.evidence])].sort();prev.induced=prev.induced&&induced;continue;}
  seen.set(id,rule);rules.push(rule);
 }
 for(const c of constraints)if(!seen.has(c.id)){seen.set(c.id,c);rules.push(c);}
 rules.sort((a,b)=>a.id<b.id?-1:1);
 return {rules,version:stableHash(rules.map(r=>[r.id,r.weight]))};
}

const scopeRank:Record<Scope,number>={project:4,industry:3,trait:2,global:1};
const scopeWeight:Record<Scope,number>={project:1,industry:.75,trait:.65,global:.5};

/** Learn a constraint from a measured revert: avoid this value for businesses
 *  that share the trait most related to the regressed measurement. */
const metricTrait:Record<string,TraitKey>={imagery:'imagery',visualBalance:'imagery',mobileLayout:'contentDepth',whitespace:'contentDepth',
 cardRepetition:'complexity',contentSpecificity:'contentDepth',typographyHierarchy:'contentDepth',ctaClarity:'conversion'};
export function constraintFromRevert(d:{dimension:Dimension;revised:string;regressed:string[];decisionId:string;projectKey:string;industry:string},
 traits:BusinessTraits):Rule|null{
 const metric=d.regressed.find(m=>metricTrait[m]);
 if(!metric)return null;
 const k=metricTrait[metric];
 const when:TraitCondition={[k]:traits[k]};
 const base={scope:'trait' as const,scopeKey:conditionKey(when),dimension:d.dimension,op:'avoid' as const,value:d.revised,when,source:'evaluation' as const};
 return {...base,id:ruleId(base),weight:.5,evidence:[d.decisionId],projects:[d.projectKey],industries:[d.industry],induced:true};
}

export function resolveRules(model:PreferenceModel,ctx:ResolveContext):ActiveRules{
 const fits=(r:Rule)=>!r.when||Boolean(ctx.traits)&&Object.entries(r.when).every(([k,v])=>ctx.traits![k as TraitKey]===v);
 const applicable=model.rules.filter(r=>fits(r)&&(r.scope==='global'||r.scope==='trait'||(r.scope==='industry'&&r.scopeKey===ctx.industry)||(r.scope==='project'&&r.scopeKey===ctx.projectKey)));
 const active:Rule[]=[],shadowed:Rule[]=[];
 for(const r of applicable){
  // Constraints learned from measurements are never shadowed by preferences.
  const beaten=r.source!=='evaluation'&&applicable.some(o=>o!==r&&o.dimension===r.dimension&&scopeRank[o.scope]>scopeRank[r.scope]&&
   (opposite[r.op].includes(o.op)&&(o.value===r.value||o.value===null||r.value===null)||
    // a more specific concrete preference on the same decision replaces a broader one
    (o.op==='prefer'&&r.op==='prefer'&&o.value!==r.value)||(o.op==='require')));
  (beaten?shadowed:active).push(r);
 }
 return {rules:active,shadowed};
}

/** Hard-rule violations for a candidate. */
export function hardViolations(active:ActiveRules,c:DesignCandidate){
 return active.rules.filter(r=>(r.op==='require'&&String(c[r.dimension])!==r.value)||(r.op==='forbid'&&String(c[r.dimension])===r.value))
  .map(r=>`${r.op} ${r.dimension}=${r.value} (${r.scope})`);
}

/** 0..1 agreement between a candidate and the soft rules. Relative rules are
 *  judged against `base`, the business's starting point. */
export function alignment(active:ActiveRules,c:DesignCandidate,base:DesignCandidate){
 let num=0,den=0;
 for(const r of active.rules){
  const w=r.weight*scopeWeight[r.scope];
  const v=String(c[r.dimension]),b=String(base[r.dimension]);
  const order=designDimensions[r.dimension] as readonly string[];
  let sat=0;
  if(r.op==='prefer'||r.op==='require')sat=v===r.value?1:0;
  else if(r.op==='avoid'||r.op==='forbid')sat=v!==r.value?1:0;
  else if(r.op==='more')sat=order.indexOf(v)>order.indexOf(b)?1:order.indexOf(v)===order.indexOf(b)&&b===order[order.length-1]?1:0;
  else if(r.op==='less')sat=order.indexOf(v)<order.indexOf(b)?1:order.indexOf(v)===0&&b===order[0]?1:0;
  num+=w*sat;den+=w;
 }
 return den?num/den:1;
}

/** Starting candidate: hard rules first, then the strongest soft rule per decision. */
export function applyRules(active:ActiveRules,base:DesignCandidate):{candidate:DesignCandidate;applied:{rule:Rule;from:string;to:string}[]}{
 const c={...base} as Record<Dimension,string>;
 const applied:{rule:Rule;from:string;to:string}[]=[];
 const set=(r:Rule,to:string)=>{if(c[r.dimension]!==to){applied.push({rule:r,from:c[r.dimension],to});c[r.dimension]=to;}};
 const byWeight=[...active.rules].sort((a,b)=>b.weight*scopeWeight[b.scope]-a.weight*scopeWeight[a.scope]||(a.id<b.id?-1:1));
 const decided=new Set<Dimension>();
 for(const r of byWeight.filter(r=>r.op==='require')){set(r,r.value!);decided.add(r.dimension);}
 const forbidden=(d:Dimension,v:string)=>active.rules.some(r=>r.dimension===d&&r.op==='forbid'&&r.value===v);
 for(const r of byWeight){
  if(decided.has(r.dimension)||r.op==='require')continue;
  const d=r.dimension;
  if(r.op==='prefer'&&r.value&&!forbidden(d,r.value)){set(r,r.value);decided.add(d);}
  else if((r.op==='more'||r.op==='less')&&ordinalDimensions.has(d)){
   const to=ordinalStep(d,c[d] as DimensionValue,r.op==='more'?'up':'down');
   if(!forbidden(d,to)){set(r,to);decided.add(d);}
  }
 }
 for(const d of Object.keys(designDimensions) as Dimension[])
  if(forbidden(d,c[d])||active.rules.some(r=>r.dimension===d&&r.op==='avoid'&&r.value===c[d]&&!decided.has(d))){
   const alt=(designDimensions[d] as readonly string[]).find(v=>!forbidden(d,v)&&!active.rules.some(r=>r.dimension===d&&(r.op==='avoid')&&r.value===v));
   const r=active.rules.find(x=>x.dimension===d&&(x.op==='forbid'||x.op==='avoid'))!;
   if(alt)set(r,alt);
  }
 return {candidate:c as DesignCandidate,applied};
}

// --- Persistence in the existing design_preference_rules table ------------
// No migration is needed: the structured rule is encoded in `instruction`.
// Trait rules are stored with scope 'global' and their condition, since the
// table's scope check allows global, vertical and project only.
const prefix='cc-rule/v2';
export function toRuleRow(r:Rule){
 return {scope:r.scope==='industry'?'vertical':r.scope==='trait'?'global':r.scope,scope_key:r.scope==='trait'?'*':r.scopeKey,
  rule_kind:r.op==='require'?'require':['avoid','forbid','less'].includes(r.op)?'avoid':'prefer',
  instruction:`${prefix} ${r.dimension} ${r.op} ${r.value??'-'} w=${r.weight} ${r.induced?'induced':'explicit'} src=${r.source} when=${r.when?conditionKey(r.when):'-'} ev=${r.evidence.slice(0,12).join(',')}`.slice(0,500)};
}
export function fromRuleRow(row:{scope:string;scope_key:string;instruction:string}):Rule|null{
 const m=row.instruction.match(/^cc-rule\/v2 (\w+) (prefer|avoid|require|forbid|more|less) (\S+) w=([\d.]+) (induced|explicit) src=(feedback|evaluation) when=(\S+) ev=(\S*)/);
 if(!m||!isDimension(m[1]))return null;
 const value=m[3]==='-'?null:m[3];
 if(value!==null&&!(designDimensions[m[1]] as readonly string[]).includes(value))return null;
 let when:TraitCondition|null=null;
 if(m[7]!=='-'){
  when={};
  for(const part of m[7].split('&')){
   const [k,v]=part.split('=');
   if(!traitKeys.includes(k as TraitKey)||v===undefined)return null;
   when[k as TraitKey]=v==='true'?true:v==='false'?false:v;
  }
 }
 const scope:Scope=row.scope==='vertical'?'industry':row.scope==='project'?'project':when?'trait':'global';
 const base={scope,scopeKey:scope==='trait'?conditionKey(when):row.scope_key,dimension:m[1],op:m[2] as Rule['op'],value,when,source:m[6] as Rule['source']};
 return {...base,id:ruleId(base),weight:Math.min(1,Number(m[4])),evidence:m[8]?m[8].split(','):[],projects:[],industries:[],induced:m[5]==='induced'};
}
