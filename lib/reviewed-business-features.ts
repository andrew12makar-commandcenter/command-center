import type {SiteBlueprint} from './site-blueprint.ts';
import type {ResearchInsight} from './research-intelligence.ts';

// Business-specific material only. Search-extracted candidates are never
// displayed before an operator marks the exact items reviewed. The company
// still must approve the full site before publication.
const kinds=new Set(['team','trust','faq','booking','gallery'] as const);
const generic=/^(home|about|about us|services|our services|read more|our work|contact|gallery|reviews|testimonials|learn more)$/i;
export type ReviewedFeature=Pick<ResearchInsight,'id'|'kind'|'label'|'detail'|'sourceUrl'>;

export function reviewedSiteFeatures(site:Pick<SiteBlueprint,'content'>):ReviewedFeature[]{
 const seen=new Set<string>();
 return site.content.researchInsights.filter(item=>{
  if(item.status!=='reviewed'||!kinds.has(item.kind as 'team'))return false;
  if(item.label.trim().length<7||generic.test(item.label.trim()))return false;
  const key=item.kind+'|'+item.label.trim().toLowerCase();
  if(seen.has(key))return false;
  seen.add(key);
  try{
   const url=new URL(item.sourceUrl);
   return ['https:','http:'].includes(url.protocol);
  }catch{return false;}
 }).slice(0,4).map(x=>({id:x.id,kind:x.kind,label:x.label,detail:x.detail,sourceUrl:x.sourceUrl}));
}
