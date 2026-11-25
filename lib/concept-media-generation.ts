export type MediaProviderKind='image_generation'|'licensed_library';
export type ConceptMediaProvider={
 id:string;kind:MediaProviderKind;configured:boolean;
 estimateCostCents:(imageCount:number)=>number;
};
export type ConceptMediaPolicy={
 enabled:boolean;explicitlyApproved:boolean;approvalReference:string;
 maxImages:number;maxCostCents:number;
};
export type ConceptMediaPlan={
 status:'blocked'|'ready';providerId:string|null;providerKind:MediaProviderKind|null;
 imageCount:number;estimatedCostCents:number;blockers:string[];
 fallback:'static_concepts'|'typographic';briefs:string[];
};

export const disabledConceptMediaProvider:ConceptMediaProvider={
 id:'disabled',kind:'image_generation',configured:false,estimateCostCents:()=>0
};

const boundedInt=(value:number,max:number)=>Number.isInteger(value)&&value>=0&&value<=max;

/** Plan only. This function cannot contact a provider, spend credits, store an
 * asset, or turn a generated concept into approved business photography. */
export function planConceptMediaGeneration(input:{
 briefs:readonly string[];provider?:ConceptMediaProvider|null;policy:ConceptMediaPolicy;
 staticFallbackAvailable:boolean;
}):ConceptMediaPlan{
 const provider=input.provider??null;
 const briefs=input.briefs.map(x=>x.trim()).filter(Boolean).slice(0,12);
 const limit=boundedInt(input.policy.maxImages,12)?input.policy.maxImages:0;
 const count=Math.min(briefs.length,limit);
 const estimated=provider?.configured?provider.estimateCostCents(count):0;
 const blockers:string[]=[];
 if(!input.policy.enabled)blockers.push('Concept-media generation is disabled for this project.');
 if(!input.policy.explicitlyApproved||input.policy.approvalReference.trim().length<8)
  blockers.push('No explicit provider and budget approval is recorded.');
 if(!provider?.configured)blockers.push('No external media provider is configured.');
 if(!boundedInt(input.policy.maxImages,12)||input.policy.maxImages<1)
  blockers.push('Image limit must be between 1 and 12.');
 if(!boundedInt(input.policy.maxCostCents,100_000)||input.policy.maxCostCents<1)
  blockers.push('A positive cost ceiling is required.');
 if(!briefs.length)blockers.push('No reviewed business-specific image briefs are available.');
 if(!Number.isFinite(estimated)||estimated<0)blockers.push('Provider cost estimate is invalid.');
 else if(estimated>input.policy.maxCostCents)blockers.push('Estimated provider cost exceeds the approved ceiling.');
 return {
  status:blockers.length?'blocked':'ready',providerId:provider?.configured?provider.id:null,
  providerKind:provider?.configured?provider.kind:null,imageCount:count,
  estimatedCostCents:estimated,blockers,briefs:briefs.slice(0,count),
  fallback:input.staticFallbackAvailable?'static_concepts':'typographic'
 };
}
