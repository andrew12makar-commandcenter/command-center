/**
 * Improve only unedited boilerplate, using existing reviewed service labels.
 * This is NOT a facts model: never invent awards, years, credentials, hours,
 * social proof, conversion terms, or patient/client outcomes.
 */
const knownBoilerplate=[
 /^clear information for a more confident next step\.?$/i,
 /^care starts with a clearer first step\.?$/i,
 /^care, made clearer\.?$/i,
 /^outdoor spaces worth coming home to\.?$/i,
 /^make room for better outdoors\.?$/i,
 /^thoughtful landscapes, built around daily life\.?$/i,
 /^a better way to meet your next customer\.?$/i,
 /^make every first impression count\.?$/i,
 /^expert help, organized around what comes next\.?$/i
];
const knownGenericDescriptions=[
 /^explore \d+ verified fixture services/i,
 /^find the information you need before reaching out/i,
 /^find essential information first/i,
 /^see the possibilities for your outdoor project/i,
 /^a simpler way to explore outdoor projects/i,
 /^explore a modern online introduction to this business/i,
 /^meet the business and explore its services/i
];
const phrase=(s:string)=>s.trim().replace(/\s+/g,' ').replace(/[.!?]+$/,'');
const limited=(s:string,max:number)=>s.length<=max?s:s.slice(0,max-1).trimEnd()+'…';

export function isGeneratedBoilerplate(text:string,kind:'headline'|'description'):boolean{
 const patterns=kind==='headline'?knownBoilerplate:knownGenericDescriptions;
 return patterns.some(p=>p.test(text.trim()));
}

export function buildServiceSpecificCopy(
 input:{headline:string;description:string;services:readonly string[];city?:string|null;
 businessName:string;factsReviewed:boolean}
):{headline:string;description:string;changed:boolean}{
 const services=input.services.map(phrase).filter(x=>x.length>=4).slice(0,3);
 if(!services.length)return {headline:input.headline,description:input.description,changed:false};
 const first=services[0],second=services[1];
 // A readable 30-65 character headline based on real named offerings.
 const combined=second&&first.length+second.length<53?first+' & '+second:first;
 const headline=isGeneratedBoilerplate(input.headline,'headline')?
  limited(combined.charAt(0).toUpperCase()+combined.slice(1)+'.',72):input.headline;
 // City is a CRM fact, not an invented geographic service-area claim.
 const city=input.city?.trim();
 const lead=services.length>=2?services.slice(0,2).join(' and '):first;
 const proposed=city?
  input.businessName+' in '+city+': explore '+lead+'. Contact the business directly for current information.':
  'Explore '+lead+' from '+input.businessName+'. Contact the business directly for current information.';
 const description=isGeneratedBoilerplate(input.description,'description')?
  limited(proposed+(input.factsReviewed?'':' Details are pending review.'),260):input.description;
 return {headline,description,changed:headline!==input.headline||description!==input.description};
}
