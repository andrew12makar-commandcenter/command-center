import {cleanSiteContent,type ImagePermission,type SiteContent} from './site-blueprint.ts';

export type RightsDecision='approved'|'rejected';
export type RightsQueueSummary={approved:number;pending:number;rejected:number;total:number};

export function summarizeAssetRights(content:Pick<SiteContent,'images'>):RightsQueueSummary{
 const approved=content.images.filter(image=>image.permission==='approved').length;
 const pending=content.images.filter(image=>image.permission==='reference_only').length;
 const rejected=content.images.filter(image=>image.permission==='rejected').length;
 return {approved,pending,rejected,total:content.images.length};
}

export function applyImageRightsDecision(content:SiteContent,input:{
 url:string;decision:RightsDecision;evidence:string;confirmed:boolean;reviewedAt:string;
}):SiteContent{
 const evidence=input.evidence.trim();
 if(evidence.length<12)throw new Error('Add a specific rights-review note (12 characters minimum).');
 if(input.decision==='approved'&&!input.confirmed)
  throw new Error('Confirm that display permission was independently verified before approval.');
 if(!Number.isFinite(Date.parse(input.reviewedAt)))throw new Error('Rights review timestamp is invalid.');
 let matched=false;
 const permission:ImagePermission=input.decision;
 const images=content.images.map(image=>{
  if(image.url!==input.url)return image;
  matched=true;
  return {...image,permission,rightsNote:evidence,rightsReviewedAt:input.reviewedAt};
 });
 if(!matched)throw new Error('Image reference is no longer part of this revision.');
 return cleanSiteContent({...content,images});
}
