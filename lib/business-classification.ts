import type {Template} from './demo-engine.ts';

// These are editable research hints, NOT verification of industry, licensing or services.
// Prefer a recorded category over a business name; do not infer a medical specialty.
export type IndustryDecision={
  template:Template|null;
  sector:'medical'|'landscaping'|'trades'|'food'|'retail'|'professional'|'other'|null;
  confidence:'category'|'name_hint'|'unknown';
  explanation:string;
};
const medical=/\b(?:doctor|doctors|medical|healthcare|health care|physician|physicians|dentist|dentists|dental|orthodont\w*|optometr\w*|ophthalm\w*|clinic|clinics|hospital|primary care|family medicine|pediatr\w*|dermatolog\w*|psychiatr\w*|psycholog\w*|chiropract\w*|podiatr\w*|physical therapy|urgent care|veterinar\w*|vet clinic|nursing)\b/i;
const landscaping=/\b(?:landscap\w*|hardscap\w*|lawn\w*|outdoor service\w*|garden\w*|arborist\w*|tree service\w*|irrigation)\b/i;
const trades=/\b(?:roof\w*|hvac|plumb\w*|electrician\w*|electrical|contract\w*|construction|remodel\w*|renovat\w*|carpent\w*|mason\w*|fenc\w*|floor\w*|house paint\w*|home improvement|pressure wash\w*|handyman|cleaning|pest control)\b/i;
const food=/\b(?:restaurant|cafe|coffee shop|coffee house|bakery|butcher|deli|pub|bar|brewery|food market|eatery|pizzeria|takeout|takeaway|cater\w*)\b/i;
const retail=/\b(?:retail|shop|store|boutique|bookstore|bookshop|booksmith|fashion|gallery|florist|gift shop|market|convenience store|convenience|wine and spirits)\b/i;
const generic=/^(?:services?|business|unknown|general|uncategorized|unclassified|certified business|local business|other|office|shop|organization|n\/a|none)$/i;
const professional=/\b(?:legal|lawyer|attorney|account\w*|finance|architect\w*|consult\w*|insurance|real estate|broker|salon)\b/i;

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
   if(medical.test(cat))return {template:'medical',sector:'medical',confidence:'category',explanation:'Medical/clinical category recorded in the CRM'};
   if(landscaping.test(cat))return {template:'landscaping',sector:'landscaping',confidence:'category',explanation:'Landscaping category recorded in the CRM'};
   if(trades.test(cat))return {template:'universal',sector:'trades',confidence:'category',explanation:'Home-service or trade category recorded; using the general trade-safe layout'};
   if(food.test(cat))return {template:'universal',sector:'food',confidence:'category',explanation:'Food and hospitality category recorded; using a menu-first layout'};
   if(retail.test(cat))return {template:'universal',sector:'retail',confidence:'category',explanation:'Retail category recorded; using a storefront-first layout'};
   return {template:'universal',sector:professional.test(cat)?'professional':'other',confidence:'category',explanation:'Other recorded industry; general business template'};
 }
 if(medical.test(name))return {template:'medical',sector:'medical',confidence:'name_hint',explanation:'Possible medical service inferred from business name; verify'};
 if(landscaping.test(name))return {template:'landscaping',sector:'landscaping',confidence:'name_hint',explanation:'Possible landscaping service inferred from business name; verify'};
 if(trades.test(name))return {template:'universal',sector:'trades',confidence:'name_hint',explanation:'Possible home-service or trade business inferred from name; verify'};
 if(food.test(name))return {template:'universal',sector:'food',confidence:'name_hint',explanation:'Possible food or hospitality business inferred from name; verify'};
 if(retail.test(name))return {template:'universal',sector:'retail',confidence:'name_hint',explanation:'Possible retail business inferred from name; verify'};
 if(professional.test(name))return {template:'universal',sector:'professional',confidence:'name_hint',explanation:'Possible professional service inferred from name; verify'};
 return {template:null,sector:null,confidence:'unknown',explanation:'No reliable industry indicator; review before selecting specialized template'};
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
 if(['medical','landscaping','trades'].includes(decision.sector||''))score+=40;
 else if(decision.template==='universal')score+=20;
 if(decision.confidence==='category')score+=15;
 if(website)score+=15;
 if(source)score+=15;
 if(city)score+=5;
 return score;
}

export function industryLabel(decision:IndustryDecision):string{
 return decision.sector==='medical'?'Medical / dental':
  decision.sector==='landscaping'?'Landscaping':
  decision.sector==='trades'?'Contractor / home service':
  decision.sector==='food'?'Food / hospitality':
  decision.sector==='retail'?'Retail / storefront':
  decision.sector==='professional'?'Professional / retail':
  decision.sector==='other'?'Other business':'Industry not yet verified';
}
