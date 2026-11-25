export type ResearchInsightKind='service'|'team'|'gallery'|'trust'|'faq'|'booking'|'contact';
export type ResearchInsight={
 id:string;
 kind:ResearchInsightKind;
 label:string;
 detail:string;
 sourceUrl:string;
 status:'candidate'|'reviewed';
};

type ResearchInput={url:string;title:string;description:string;headings:string[];excerpts:string[]};

const generic=/^(home|welcome|learn more|read more|our services|services|what we do|about|about us|contact|contact us|menu|explore)$/i;
const serviceVocabulary=/\b(?:care|dent\w*|sedation|orthodont\w*|prevention|rehabilitation|cosmetic|health|financ\w*|design\w*|installation|maintenance|hardscap\w*|landscap\w*|lawn|irrigation|planting|cleanup|consult\w*|strategy|planning|support|delivery|repair|exam\w*|screening|coordination|organizing|move\w*)\b/i;
const hash=(value:string)=>[...value].reduce((n,c)=>((n*33+c.charCodeAt(0))>>>0),5381).toString(36);
const clean=(value:string,max=180)=>value.replace(/\s+/g,' ').trim().slice(0,max);

function addInsight(
 output:ResearchInsight[],seen:Set<string>,kind:ResearchInsightKind,label:string,
 sourceUrl:string,detail=''
){
 const safeLabel=clean(label,140);
 if(safeLabel.length<4||generic.test(safeLabel))return;
 const key=kind+'|'+safeLabel.toLowerCase();
 if(seen.has(key))return;
 seen.add(key);
 output.push({id:hash(key+'|'+sourceUrl),kind,label:safeLabel,detail:clean(detail,260),sourceUrl,status:'candidate'});
}

/** Convert source text into reviewable candidates, never published claims. */
export function deriveResearchInsights(pages:ResearchInput[]):ResearchInsight[]{
 const output:ResearchInsight[]=[],seen=new Set<string>();
 for(const page of pages.slice(0,8)){
  let path='';
  try{path=new URL(page.url).pathname.toLowerCase();}catch{continue;}
  const context=[page.title,...page.headings].join(' ').toLowerCase();
  const detail=page.excerpts[0]||page.description;
  const servicePage=/service|treatment|procedure|care|solution|offering|dentistry|landscap/.test(path+' '+context);
  const teamPage=/team|staff|provider|doctor|dentist|leadership|about/.test(path+' '+context);
  if(servicePage){
   for(const heading of page.headings.slice(0,16)){
    const words=heading.trim().split(/\s+/).length;
    if(words<=7&&!/[.!?]$/.test(heading)&&
      !/\b(dr\.?|doctor|team|staff|provider|contact|address|hours|welcome|expectations?)\b/i.test(heading)&&
      !/\b(we|you|your|our)\b/i.test(heading)&&serviceVocabulary.test(heading))addInsight(output,seen,'service',heading,page.url,detail);
   }
  }
  if(teamPage){
   for(const heading of page.headings.slice(0,12))
    if(heading.trim().split(/\s+/).length<=8&&/\b(dr\.?|doctor|dentist|founder|director|team|staff|provider|meet)\b/i.test(heading))
     addInsight(output,seen,'team',heading,page.url,detail);
  }
  if(/gallery|portfolio|projects?|before[- ]and[- ]after|our work|case studies/.test(path+' '+context))
   addInsight(output,seen,'gallery',page.title||'Gallery or portfolio',page.url,detail);
  if(/testimonial|reviews?|awards?|accredit|association|credentials?/.test(context))
   addInsight(output,seen,'trust',page.headings.find(x=>/testimonial|review|award|accredit|association|credential/i.test(x))||page.title,page.url,detail);
  if(/\bfaq|frequently asked|questions and answers\b/.test(path+' '+context))
   addInsight(output,seen,'faq',page.headings.find(x=>/faq|frequently asked|questions/i.test(x))||page.title,page.url,detail);
  if(/appointment|schedule|booking|book online|request a visit/.test(path+' '+context))
   addInsight(output,seen,'booking',page.headings.find(x=>/appointment|schedule|booking|book|request/i.test(x))||page.title,page.url,detail);
  if(/contact|location|hours|directions/.test(path+' '+context))
   addInsight(output,seen,'contact',page.headings.find(x=>/contact|location|hours|directions/i.test(x))||page.title,page.url,detail);
 }
 return output.slice(0,60);
}

export function groupResearchInsights(insights:ResearchInsight[]){
 return insights.reduce<Partial<Record<ResearchInsightKind,ResearchInsight[]>>>((groups,item)=>{
  (groups[item.kind]??=[]).push(item);return groups;
 },{});
}
