// Feedback -> statements -> structured design signals.
//
// Notes are split into statements. Each statement keeps the reviewer's exact
// words and is classified as praise, criticism, a requirement, or unclear.
// Each is then read for which design decision it concerns, which way an
// ordinal decision should move, how strongly, and how widely it applies
// (project, business trait, industry, or global). The reviewed page's actual
// decisions are attached, so every signal records the prior value it judged.
// Statements that cannot be attributed are kept as `unclear`, never guessed.
// No model call is involved; this is lexical rules over a fixed vocabulary.
import {designDimensions,ordinalDimensions,type BusinessTraits,type DesignCandidate,type Dimension,type TraitKey} from './design-space.ts';

export type FeedbackEvent={
 id:string;projectKey:string;industry:string;
 rating?:number|null;notes?:string|null;tags?:string[]|null;
 /** The design decisions of the revision that was reviewed. */
 reviewed:DesignCandidate;
 /** Traits of the reviewed business; lets induced rules carry conditions. */
 traits?:BusinessTraits|null;
 /** Identifier of the rendered revision that was reviewed. */
 revisionId?:string|null;
 createdAt?:string|null;
};
export type SignalOp='prefer'|'avoid'|'require'|'forbid'|'more'|'less'|'keep';
export type Scope='project'|'trait'|'industry'|'global';
export type TraitCondition=Partial<Record<TraitKey,string|boolean>>;
export type StatementKind='praise'|'criticism'|'requirement'|'unclear';
export type Signal={
 eventId:string;scope:Scope;scopeKey:string;projectKey:string;industry:string;traits:BusinessTraits|null;
 /** Present when the reviewer scoped the statement to a kind of business. */
 condition?:TraitCondition|null;
 dimension:Dimension;op:SignalOp;value:string|null;prior:string;
 strength:number;polarity:'positive'|'negative';evidence:string;statementIndex:number;
};
export type Statement={index:number;text:string;kind:StatementKind;scope:Scope;signalCount:number};
export type Interpretation={statements:Statement[];signals:Signal[];uninterpreted:string[];ratingOnly:boolean};

type Concept={dimension:Dimension;pattern:RegExp;value?:string};
// Order matters only within a dimension: the first concept with a value wins.
const concepts:Concept[]=[
 {dimension:'motionSystem',pattern:/\b(no animation|without animation|static page|no motion)\b/,value:'minimal'},
 {dimension:'motionSystem',pattern:/\b(dramatic|cinematic) (motion|animation|transitions?|reveals?)\b/,value:'cinematic'},
 {dimension:'motionSystem',pattern:/\b(subtle|gentle|soft) (motion|animation|transitions?|reveals?|fades?)\b/,value:'calm'},
 {dimension:'motionSystem',pattern:/\b(snappy|crisp|precise) (motion|animation|transitions?|reveals?)\b/,value:'precise'},
 {dimension:'motionSystem',pattern:/\b(animat\w*|motion|transitions?|scroll effects?|movement|reveals?|parallax|fade[- ]ins?)\b/},
 {dimension:'composition',pattern:/\b(full[- ]bleed|immersive|cinematic|edge[- ]to[- ]edge)\b/,value:'immersive'},
 {dimension:'composition',pattern:/\b(cards?|tiles?|bento|boxes|boxy|break the grid)\b/,value:'bento'},
 {dimension:'composition',pattern:/\b(index|directory|list layout|plain list)\b/,value:'service-index'},
 {dimension:'composition',pattern:/\b(centered|centred|symmetric\w*)\b/,value:'centered'},
 {dimension:'composition',pattern:/\b(asymmetric\w*|offset|off[- ]center|off[- ]grid)\b/,value:'asymmetric'},
 {dimension:'composition',pattern:/\b(split|side[- ]by[- ]side|two[- ]column)\b/,value:'split-editorial'},
 {dimension:'composition',pattern:/\b(layout|composition|structure)\b/},
 {dimension:'typography',pattern:/\b(serif)\b(?! ?-?less)/,value:'editorial-serif'},
 {dimension:'typography',pattern:/\b(sans[- ]?serif|sans)\b/,value:'humanist-sans'},
 {dimension:'typography',pattern:/\b(geometric (type|font)s?)\b/,value:'geometric-sans'},
 {dimension:'typography',pattern:/\b(bold|heavy|chunky|loud|display) (type|font|headlines?|headings?|lettering)\b/,value:'grotesk-display'},
 {dimension:'typography',pattern:/\b(type|font|typography)\b[^.]*\b(heavier|bolder)\b|\bgo (heavier|bolder)\b/,value:'grotesk-display'},
 {dimension:'typography',pattern:/\b(fonts?|typefaces?|typography|type|lettering|headlines? font)\b/},
 {dimension:'palette',pattern:/\b(dark|moody|black background|night)\b/,value:'graphite'},
 {dimension:'palette',pattern:/\b(warm|earthy|terracotta|rust)\b/,value:'clay'},
 {dimension:'palette',pattern:/\b(green|natural|botanical)\b/,value:'forest'},
 {dimension:'palette',pattern:/\b(blue|cool|nautical|clinical colou?rs?)\b/,value:'harbor'},
 {dimension:'palette',pattern:/\b(orange|vibrant|bright colou?rs?|punchy)\b/,value:'orchard'},
 {dimension:'palette',pattern:/\b(monochrome|black and white|neutral)\b/,value:'ink-paper'},
 {dimension:'palette',pattern:/\b(colou?rs?|palette|colou?r scheme)\b/},
 {dimension:'imageryDensity',pattern:/\b(?:no|without|zero)\s+(?:photos?|photographs?|images?|imagery|pictures?|galler(?:y|ies))\b/,value:'none'},
 {dimension:'imageryDensity',pattern:/\b(photos?|photograph\w*|images?|imagery|pictures?|visuals?|gallery)\b|\bshould be the hero\b|\bshow (a lot )?more of\b/},
 {dimension:'spacing',pattern:/\b(spacing|white ?space|padding|breathing room|room to breathe|space to breathe|airy|cramped|crowded|squeezed|jammed|gaps?|empty space)\b/},
 {dimension:'copyDepth',pattern:/\b(copy|text|words|wordy|writing|paragraphs?|walls? of text|details?|information|info)\b/},
 {dimension:'ctaStructure',pattern:/\b(los(e|ing) the|gets lost|hard to find|can'?t find)\b[^.]*\b(buttons?|cta|call|book|order|quote)\b|\b(buttons?|call option|cta)\b[^.]*\b(disappears?|gets lost)\b/,value:'sticky-bar'},
 {dimension:'ctaStructure',pattern:/\b(sticky|floating|pinned)\b|\b(always|stays?|remain\w*) (be )?(visible|on screen)\b/,value:'sticky-bar'},
 {dimension:'ctaStructure',pattern:/\b(buttons?|ctas?|calls? to action|book(ing)? link|contact link)\b/},
 {dimension:'hierarchy',pattern:/\b(reviews?|credentials?|proof|trust|team|staff|people|bios?|doctors?|dentists?|vets?|veterinarians?|attorneys?|lawyers?|tutors?|teachers?|instructors?|coaches?|therapists?|clinicians?|accountants?|qualifications?|accreditations?|licen[cs]es?|certifications?)\b/,value:'proof-first'},
 {dimension:'hierarchy',pattern:/\b(story|history|mission|about section)\b/,value:'story-first'},
 {dimension:'hierarchy',pattern:/\b(services?|menu|offerings?|products?|what (they|we) (do|offer|sell))\b/,value:'offer-first'},
 {dimension:'hierarchy',pattern:/\b(how to (book|call|order|reach)|booking|hours|location|address|phone number)\b/,value:'action-first'},
];
// Hierarchy concepts only count when the statement talks about position.
const positional=/\b(first|up top|at the top|top of the page|lead with|earlier|higher|buried|lower down|further down|too far down|sooner|before|above the fold)\b/;
// A buried section should move up. A section the reviewer explicitly rejects
// as first should not be recommended again merely because it was mentioned.
const buriedContent=/\b(buried|hard to find|hidden|missing|too far down|needs? to be higher|should be higher)\b/;

const negative=/\b(template|cookie[- ]cutter|everywhere|too|overly|hate|dislike|don'?t like|do not like|not a fan|ugly|cluttered|busy|distracting|overwhelming|boring|bland|plain|generic|weak|confusing|hard to|cheap|dated|cramped|crowded|squeezed|messy|awkward|lacks?|lacking|missing|not enough|can'?t find|buried|feels? like a template|template-y|sterile|lifeless|static|flat|cold|harsh|noisy|wrong|disappears?|losing|lost)\b/;
const positive=/\b(love|loved|like|liked|great|works|working|nice|good|perfect|strong|beautiful|clean|keep|more of this|exactly|spot on|elegant|clear|lovely|gorgeous|excellent|fantastic|right|fits|suits|appropriate)\b/;
// Hedged approval ("not bad") is weak praise, not a complaint.
const mildPraise=/\b(not bad|isn'?t bad|not too)\b/;
const directional:Partial<Record<Dimension,{up:RegExp;down:RegExp}>>={
 spacing:{up:/\b(cramped|crowded|squeezed|jammed|tight|dense|cluttered|busy|not enough (white ?space|space|padding|room)|too little (white ?space|space|padding|room)|more (white ?space|breathing room|padding|space)|room to breathe|space to breathe|airier|needs? room)\b/,
  down:/\b(too much (white ?space|space|padding)|empty|sparse|gaps?|too airy|tighten|tighter|compact|less (space|padding))\b/},
 imageryDensity:{up:/\b(more|bigger|larger|not enough|too few|lacks?|missing|plain|bland|text[- ]heavy|add|needs?|show)\b/,
  down:/\b(less|fewer|too many|too much|overwhelming|distracting|busy|cluttered|dominat\w*|reduce|cut|drop|remove|smaller)\b/},
 motionSystem:{up:/\b(more|static|lifeless|flat|boring|not enough|bolder|livelier|add|movement)\b/,
  down:/\b(less|too much|too many|distracting|dizzy\w*|nause\w*|overwhelming|flashy|slow|tone (it )?down|dial (it )?back|calmer|subtler|reduce|remove)\b/},
 copyDepth:{up:/\b(more (detail|details|information|info|copy|text)|not enough|thin|vague|generic|missing|lacks?|explain)\b/,
  down:/\b(wordy|too long|too much|walls? of text|shorter|less|trim|cut|tighten|concise|essay)\b/},
};
const request=/\b(try|use|go with|want|wants|should|would|could we|please|switch to|make|needs? (a|an|to be)|lead with|put|move|show|keep it|break)\b/;
const prohibit=/\b(never|avoid|stop using|stop (?:putting|placing|leading with)|no more|don'?t (?:ever )?(?:use|put|lead with|start with)|do not (?:ever )?(?:use|put|lead with|start with)|don'?t make|do not make)\b/;
const hardCue=/\b(always|never|must|every time|do not ever|don'?t ever|under no circumstances)\b/;
const negator=/\b(don'?t|do not|doesn'?t|does not|didn'?t|not|no need for|stop|never|without)\b[^.]{0,24}\b(more|add|adding)\b/;
const intensifier=/\b(really|very|way|so|much|definitely|absolutely|extremely|completely)\b|!/;
const hedge=/\b(maybe|slightly|a bit|a little|kind of|sort of|might|perhaps|could)\b/;
const globalScope=/\b(all (sites|websites|concepts|designs|businesses|pages)|every (site|website|business|concept|design)|in general|across the board|on any site)\b/;
const industryScope=/\b(for (businesses|sites|practices|companies) like this|this (kind|type) of (business|site|practice)|in this industry|for this industry|this category|for (all|other) (\w+ ){0,2}(practices|shops|firms|studios|restaurants|clinics|contractors|salons|gyms|schools|nonprofits))\b/;
// "for businesses that ..." names a trait, not an industry.
const traitScopes:{pattern:RegExp;condition:TraitCondition}[]=[
 {pattern:/\bfor (any|every|all)?\s*(business(es)?|sites?|practices?|places?) (that|where|with|who)\b[^.]*\b(trust|credential\w*|licen[cs]\w*|sensitive)\b/,condition:{trust:'high'}},
 {pattern:/\bfor (any|every|all)?\s*(business(es)?|sites?|services?) (that|where|with|who|offering)\b[^.]*\b(emergenc\w*|urgent|same[- ]day)\b/,condition:{urgent:true}},
 {pattern:/\bfor (any|every|all)?\s*(business(es)?|sites?) (that|where|whose|with|who)\b[^.]*\b(visual|photos? of (the|their) work|portfolio|show (their|the) work|looks?)\b/,condition:{visualProof:true}},
 {pattern:/\bfor (any|every|all)?\s*(business(es)?|sites?|organi[sz]ations?) (that|where|with|who)\b[^.]*\b(donations?|fundrais\w*)\b/,condition:{conversion:'donation'}},
 {pattern:/\bfor (any|every|all)?\s*(business(es)?|sites?|services?) (that|where|with|who)\b[^.]*\b(come to you|on[- ]site|travel to)\b/,condition:{locality:'on-site'}},
];

const tagConcepts:Record<string,{dimension:Dimension;op:SignalOp}>={
 layout:{dimension:'composition',op:'avoid'},mobile:{dimension:'spacing',op:'less'},
 generic_copy:{dimension:'copyDepth',op:'more'},navigation:{dimension:'ctaStructure',op:'avoid'},
 missing_content:{dimension:'copyDepth',op:'more'},visuals:{dimension:'imageryDensity',op:'more'},
};

/** Split while keeping the reviewer's original wording for the record. */
export function splitStatements(text:string){
 return text.replace(/[“”]/g,'"').replace(/[’]/g,"'")
  .split(/(?<=[.!?;])\s+|\s+(?:but|although|though|however|whereas)\s+|\n+/i)
  .map(s=>s.trim()).filter(s=>s.length>2);
}

export function interpretFeedback(e:FeedbackEvent):Interpretation{
 const signals:Signal[]=[],uninterpreted:string[]=[],statements:Statement[]=[];
 const rating=typeof e.rating==='number'&&e.rating>=1&&e.rating<=5?e.rating:null;
 const ratingBoost=rating===null?0:Math.abs(rating-3)*.08;
 const industryWord=e.industry.toLowerCase();
 let statementIndex=0;
 const push=(s:Omit<Signal,'eventId'|'projectKey'|'industry'|'scopeKey'|'traits'|'statementIndex'>)=>{
  const scopeKey=s.scope==='global'?'*':s.scope==='industry'?e.industry:s.scope==='trait'?
   Object.entries(s.condition??{}).map(([k,v])=>`${k}=${v}`).join('&'):e.projectKey;
  signals.push({...s,scopeKey,eventId:e.id,projectKey:e.projectKey,industry:e.industry,traits:e.traits??null,statementIndex});
 };
 for(const original of splitStatements(e.notes??'')){
  const clause=original.toLowerCase();
  statementIndex=statements.length;
  const before=signals.length;
  const trait=traitScopes.find(t=>t.pattern.test(clause));
  const scope:Scope=trait?'trait':globalScope.test(clause)?'global':industryScope.test(clause)||clause.includes(industryWord+'s')?'industry':'project';
  const condition=trait?.condition??null;
  const hard=hardCue.test(clause);
  const mild=mildPraise.test(clause);
  const neg=!mild&&(negative.test(clause)||prohibit.test(clause)||/\b(\w{3,}) on \1\b/.test(clause));
  // "looks like a template" is a comparison, not praise.
  const pos=mild||(positive.test(clause.replace(/\b(looks?|feels?|seems?|sounds?|more) like\b|\blike (a|an|the|this)\b/g,''))&&
   !/\b(don'?t|do not|doesn'?t|didn'?t) (like|love)\b/.test(clause));
  let strength=.5+ratingBoost+(intensifier.test(clause)?.2:0)-(hedge.test(clause)||mild?.25:0);
  strength=Math.max(.1,Math.min(1,hard?1:strength));
  // Per decision, a concept naming a value beats a bare mention, and the
  // earliest mention wins ("menu first, before the story" is about the menu).
  const matched=new Map<Dimension,Concept>(),at=new Map<Dimension,number>();
  for(const c of concepts){
   const m=c.pattern.exec(clause);
   if(!m)continue;
   if(c.dimension==='hierarchy'&&!positional.test(clause))continue;
   const prev=matched.get(c.dimension);
   if(!prev||(!prev.value&&c.value)||(Boolean(prev.value)===Boolean(c.value)&&m.index<at.get(c.dimension)!)){
    matched.set(c.dimension,c);at.set(c.dimension,m.index);
   }
  }
  // "cinematic" names motion when the statement is about motion, layout otherwise.
  if(matched.get('motionSystem')&&matched.get('composition')?.value==='immersive'&&!/\b(full[- ]bleed|edge[- ]to[- ]edge|layout)\b/.test(clause))
   matched.delete('composition');
  for(const [dimension,c] of matched){
   const prior=String(e.reviewed[dimension]);
   const lex=directional[dimension];
   let dir:'up'|'down'|null=lex?(lex.up.test(clause)&&!lex.down.test(clause)?'up':lex.down.test(clause)&&!lex.up.test(clause)?'down':
    lex.down.test(clause)&&lex.up.test(clause)&&neg&&!pos?'down':null):null;
   if(dir&&negator.test(clause))dir=dir==='up'?'down':'up';
   // An absolute image prohibition is a hard constraint, not a vague request
   // to decrease density by one step. This still respects licensing gates.
   if(dimension==='imageryDensity'&&c.value==='none'){
    push({scope,condition,dimension,op:'require',value:'none',prior,strength:1,polarity:'negative',evidence:original});
    continue;
   }
   if(ordinalDimensions.has(dimension)&&!c.value&&dir){
    // A complaint about amount moves the decision; praise of amount keeps it.
    if(pos&&!neg)push({scope,condition,dimension,op:'keep',value:prior,prior,strength,polarity:'positive',evidence:original});
    else push({scope,condition,dimension,op:dir==='up'?'more':'less',value:null,prior,strength,polarity:'negative',evidence:original});
    continue;
   }
   const value=c.value??null;
   if(value&&!(designDimensions[dimension] as readonly string[]).includes(value))continue;
   if(neg&&!pos){
    if(hard&&value&&prohibit.test(clause))push({scope,condition,dimension,op:'forbid',value,prior,strength,polarity:'negative',evidence:original});
    else if(value&&((dimension==='hierarchy'&&buriedContent.test(clause))||(hard&&request.test(clause)&&!prohibit.test(clause))||(dimension==='ctaStructure'&&value==='sticky-bar'&&!prohibit.test(clause))))
     push({scope,condition,dimension,op:hard?'require':'prefer',value,prior,strength,polarity:'negative',evidence:original});
    else push({scope,condition,dimension,op:'avoid',value:value??prior,prior,strength,polarity:'negative',evidence:original});
   }else if(pos||hard){
    const target=value??prior;
    push({scope,condition,dimension,op:hard?'require':target===prior?'keep':'prefer',value:target,prior,strength,polarity:'positive',evidence:original});
   }else if(value&&(request.test(clause)||dimension==='hierarchy'||clause.split(/\s+/).length<=8)){
    // Neutral phrasing that asks for a value ("try a serif", "use cards") is a request.
    push({scope,condition,dimension,op:'prefer',value,prior,strength:strength*.8,polarity:'negative',evidence:original});
   }
  }
  const produced=signals.slice(before);
  const kind:StatementKind=!produced.length?'unclear':produced.some(s=>s.op==='require'||s.op==='forbid')?'requirement':
   produced.every(s=>s.polarity==='positive')?'praise':'criticism';
  statements.push({index:statementIndex,text:original,kind,scope,signalCount:produced.length});
  if(!produced.length)uninterpreted.push(clause);
 }
 for(const tag of e.tags??[]){
  const m=tagConcepts[tag];if(!m)continue;
  if(signals.some(s=>s.dimension===m.dimension))continue;
  const prior=String(e.reviewed[m.dimension]);
  statementIndex=statements.length;
  statements.push({index:statementIndex,text:`issue tag: ${tag}`,kind:'criticism',scope:'project',signalCount:1});
  push({scope:'project',dimension:m.dimension,op:m.op,value:m.op==='avoid'?prior:null,prior,strength:.3,polarity:'negative',evidence:`tag:${tag}`});
 }
 const ratingOnly=!signals.length&&rating!==null;
 if(ratingOnly&&rating!>=4){
  statementIndex=statements.length;
  statements.push({index:statementIndex,text:`rating ${rating} with no notes`,kind:'praise',scope:'project',signalCount:Object.keys(designDimensions).length});
  for(const d of Object.keys(designDimensions) as Dimension[])
   push({scope:'project',dimension:d,op:'keep',value:String(e.reviewed[d]),prior:String(e.reviewed[d]),strength:.15,polarity:'positive',evidence:`rating ${rating} with no notes`});
 }
 return {statements,signals,uninterpreted,ratingOnly};
}
