import type {Template} from './demo-engine.ts';

// These are editable research hints, NOT verification of industry, licensing or services.
// Prefer a recorded category over a business name; do not infer a medical specialty.
export type IndustryDecision={
  template:Template|null;
  confidence:'category'|'name_hint'|'unknown';
  explanation:string;
};
const medical=/\b(?:doctor|doctors|medical|healthcare|health care|physician|physicians|dentist|dentists|dental|orthodont\w*|optometr\w*|ophthalm\w*|clinic|clinics|hospital|primary care|family medicine|pediatr\w*|dermatolog\w*|psychiatr\w*|psycholog\w*|chiropract\w*|podiatr\w*|physical therapy|urgent care|veterinar\w*|vet clinic|nursing)\b/i;
const home=/\b(?:landscap\w*|hardscap\w*|lawn\w*|outdoor service\w*|garden\w*|arborist\w*|tree service\w*|irrigation|roof\w*|hvac|plumb\w*|electrician\w*|electrical|contract\w*|construction|remodel\w*|renovat\w*|carpent\w*|mason\w*|fenc\w*|floor\w*|house paint\w*|home improvement|pressure wash\w*|handyman)\b/i;
const generic=/^(?:services?|business|unknown|general|uncategorized|unclassified|certified business|local business|other|office|shop|organization|n\/a|none)$/i;
const professional=/\b(?:legal|lawyer|attorney|account\w*|finance|architect\w*|consult\w*|insurance|real estate|broker|salon|restaurant|cafe|retail|bakery)\b/i;

// A legal structure (LLC, Corporation, Sole Proprietorship...) describes how a company is
// registered, not what it does. It must never become an industry conclusion.
const legal=/^(?:[\w.&'-]+\s+)?(?:limited liability company|limited liability partnership|l\.?l\.?c\.?|l\.?l\.?p\.?|p\.?l\.?l\.?c\.?|corporation|corp\.?|incorporated|inc\.?|sole proprietorship|sole proprietor|partnership|general partnership|limited partnership|non-?profit(?: corporation)?|professional corporation|s[- ]corp(?:oration)?|c[- ]corp(?:oration)?|trust|cooperative)(?:\s*\([^)]*\))?\.?$/i;
export function isLegalStructure(value:string|null|undefined):boolean{
 const v=(value||'').trim();
 return v.length>0&&v.length<=80&&legal.test(v);
}
export function classifyIndustry(name:string, category:string|null|undefined):IndustryDecision{
 const cat=isLegalStructure(category)?'':(category||'').trim();
 if(cat && !generic.test(cat)){
   if(medical.test(cat))return {template:'medical',confidence:'category',explanation:'Medical/clinical category recorded in the CRM'};
   if(home.test(cat))return {template:'landscaping',confidence:'category',explanation:'Home/field-services category recorded in the CRM'};
   // A real category that is neither medical nor home services should never default to landscaping.
   return {template:'universal',confidence:'category',explanation:'Other recorded industry; general business template'};
 }
 if(medical.test(name))return {template:'medical',confidence:'name_hint',explanation:'Possible medical service inferred from business name; verify'};
 if(home.test(name))return {template:'landscaping',confidence:'name_hint',explanation:'Possible home service inferred from business name; verify'};
 if(professional.test(name))return {template:'universal',confidence:'name_hint',explanation:'Possible professional/retail business inferred from name; verify'};
 return {template:null,confidence:'unknown',explanation:'No reliable industry indicator; review before selecting specialized template'};
}

// Known-category evidence always wins over a form default or an accidental mismatch.
// Unknown businesses get a conservative universal template unless manually specified.
export function resolveDemoTemplate(
  name:string,category:string|null|undefined,requested:string
):{template:Template;decision:IndustryDecision;corrected:boolean}{
 const decision=classifyIndustry(name,category);
 const valid:Template[]=['landscaping','medical','universal'];
 const selected=valid.includes(requested as Template)?requested as Template:'universal';
 const template=decision.template??selected;
 return {template,decision,corrected:decision.template!==null && requested!=='auto' && requested!==template};
}

// Readiness to RESEARCH, not probability of purchase or revenue. No invented budgets.
export function researchPriority(name:string,category:string|null|undefined,website:string|null|undefined,source:string|null|undefined,city:string|null|undefined):number{
 const decision=classifyIndustry(name,category);
 let score=0;
 if(decision.template==='medical'||decision.template==='landscaping')score+=40;
 else if(decision.template==='universal')score+=20;
 if(decision.confidence==='category')score+=15;
 if(website)score+=15;
 if(source)score+=15;
 if(city)score+=5;
 return score;
}

export function industryLabel(decision:IndustryDecision):string{
 return decision.template==='medical'?'Medical / dental':
  decision.template==='landscaping'?'Home & field services':
  decision.template==='universal'?'Other business':'Industry not yet verified';
}
