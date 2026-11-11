import type {Template} from './demo-engine.ts';

// These are editable research hints, NOT verification of industry, licensing or services.
// Prefer a recorded category over a business name; do not infer a medical specialty.
export type BusinessLine='barber'|'salon'|'produce'|'deli'|'convenience'|null;
export type IndustryDecision={
 template:Template|null;
 sector:'medical'|'landscaping'|'trades'|'food'|'retail'|'professional'|'personal_care'|'other'|null;
 line:BusinessLine;
 confidence:'category'|'name_hint'|'unknown';
 explanation:string;
};
const medical=/\b(?:doctor|doctors|medical|healthcare|health care|physician|physicians|dentist|dentists|dental|orthodont\w*|optometr\w*|ophthalm\w*|clinic|clinics|hospital|primary care|family medicine|pediatr\w*|dermatolog\w*|psychiatr\w*|psycholog\w*|chiropract\w*|podiatr\w*|physical therapy|urgent care|veterinar\w*|vet clinic|nursing)\b/i;
const landscaping=/\b(?:landscap\w*|hardscap\w*|lawn\w*|outdoor service\w*|garden\w*|arborist\w*|tree service\w*|irrigation)\b/i;
const trades=/\b(?:roof\w*|hvac|plumb\w*|electrician\w*|electrical|contract\w*|construction|remodel\w*|renovat\w*|carpent\w*|mason\w*|fenc\w*|floor\w*|house paint\w*|home improvement|pressure wash\w*|handyman|cleaning|pest control)\b/i;
const food=/\b(?:restaurant|cafe|coffee shop|coffee house|bakery|butcher|deli|pub|bar|brewery|food market|eatery|pizzeria|takeout|takeaway|cater\w*)\b/i;
const retail=/\b(?:retail|shop|store|boutique|bookstore|bookshop|booksmith|fashion|gallery|florist|gift shop|market|convenience store|convenience|wine and spirits)\b/i;
const generic=/^(?:services?|business|unknown|general|uncategorized|unclassified|certified business|local business|other|office|shop|organization|n\/a|none)$/i;
// Salon is personal care, not a law or accounting practice. "bar" is not "barber".
const professional=/\b(?:legal|lawyer|attorney|account\w*|finance|architect\w*|consult\w*|insurance|real estate|broker)\b/i;
const barber=/\b(?:barbers?|barbershops?|barber\s+shops?)\b/i;
const salon=/\b(?:salons?|skin\s*care|skincare|estheticians?|hair\s+(?:salons?|studios?|stylists?)|hairstylists?|nail\s+salons?|spas?)\b/i;
const produce=/\b(?:produce|grocer(?:y|ies)|grocers?|greengrocers?|supermarkets?|superettes?|fruit\s+and\s+produce|fruit\s+markets?)\b/i;
const deli=/\b(?:delis?|delicatessens?|butchers?|butcher\s+shops?|meat\s+markets?|food\s+markets?|deli\s+markets?)\b/i;
const convenience=/\b(?:convenience(?:\s+stores?)?|variety\s+stores?|corner\s+stores?)\b/i;

// A legal structure (LLC, Corporation, Sole Proprietorship...) describes how a company is
// registered, not what it does. It must never become an industry conclusion.
const legal=/^(?:[\w.&'-]+\s+)?(?:limited liability company|limited liability partnership|l\.?l\.?c\.?|l\.?l\.?p\.?|p\.?l\.?l\.?c\.?|corporation|corp\.?|incorporated|inc\.?|sole proprietorship|sole proprietor|partnership|general partnership|limited partnership|non-?profit(?: corporation)?|professional corporation|s[- ]corp(?:oration)?|c[- ]corp(?:oration)?|trust|cooperative)(?:\s*\([^)]*\))?\.?$/i;
export function isLegalStructure(value:string|null|undefined):boolean{
 const v=(value||'').trim();
 return v.length>0&&v.length<=80&&legal.test(v);
}
function decided(
 template:Template|null,sector:IndustryDecision['sector'],confidence:IndustryDecision['confidence'],
 explanation:string,line:BusinessLine=null
):IndustryDecision{
 return {template,sector,line,confidence,explanation};
}
// Checked before generic food/retail so "barber shop" is not just a shop and
// "deli market" is not just a market. These are name and category hints only.
function specificLine(text:string):{line:Exclude<BusinessLine,null>;sector:'personal_care'|'retail'|'food';label:string}|null{
 if(barber.test(text))return {line:'barber',sector:'personal_care',label:'Barber'};
 if(salon.test(text))return {line:'salon',sector:'personal_care',label:'Salon or skin care'};
 if(produce.test(text))return {line:'produce',sector:'retail',label:'Produce or grocery'};
 if(deli.test(text))return {line:'deli',sector:'food',label:'Deli or market'};
 if(convenience.test(text))return {line:'convenience',sector:'retail',label:'Convenience store'};
 return null;
}
export function classifyIndustry(name:string, category:string|null|undefined):IndustryDecision{
 const cat=isLegalStructure(category)?'':(category||'').trim();
 if(cat && !generic.test(cat)){
  if(medical.test(cat))return decided('medical','medical','category','Medical/clinical category recorded in the CRM');
  if(landscaping.test(cat))return decided('landscaping','landscaping','category','Landscaping category recorded in the CRM');
  if(trades.test(cat))return decided('universal','trades','category','Home-service or trade category recorded; using the general trade-safe layout');
  const specific=specificLine(cat);
  if(specific)return decided('universal',specific.sector,'category',specific.label+' category recorded in the CRM',specific.line);
  if(food.test(cat))return decided('universal','food','category','Food and hospitality category recorded; using a menu-first layout');
  if(retail.test(cat))return decided('universal','retail','category','Retail category recorded; using a storefront-first layout');
  return decided('universal',professional.test(cat)?'professional':'other','category','Other recorded industry; general business template');
 }
 if(medical.test(name))return decided('medical','medical','name_hint','Possible medical service inferred from business name; verify');
 if(landscaping.test(name))return decided('landscaping','landscaping','name_hint','Possible landscaping service inferred from business name; verify');
 if(trades.test(name))return decided('universal','trades','name_hint','Possible home-service or trade business inferred from name; verify');
 const named=specificLine(name);
 if(named)return decided('universal',named.sector,'name_hint','Possible '+named.label.toLowerCase()+' business inferred from name; verify',named.line);
 if(food.test(name))return decided('universal','food','name_hint','Possible food or hospitality business inferred from name; verify');
 if(retail.test(name))return decided('universal','retail','name_hint','Possible retail business inferred from name; verify');
 if(professional.test(name))return decided('universal','professional','name_hint','Possible professional service inferred from name; verify');
 return decided(null,null,'unknown','No reliable industry indicator; review before selecting specialized template');
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
 if(decision.line==='barber')return 'Barber';
 if(decision.line==='salon')return 'Salon / skin care';
 if(decision.line==='produce')return 'Produce / grocery';
 if(decision.line==='deli')return 'Deli / market';
 if(decision.line==='convenience')return 'Convenience store';
 return decision.sector==='medical'?'Medical / dental':
  decision.sector==='landscaping'?'Landscaping':
  decision.sector==='trades'?'Contractor / home service':
  decision.sector==='food'?'Food / hospitality':
  decision.sector==='retail'?'Retail / storefront':
  decision.sector==='professional'?'Professional / retail':
  decision.sector==='personal_care'?'Personal care':
  decision.sector==='other'?'Other business':'Industry not yet verified';
}
