import type {BoardStage} from './opportunity-board.ts';

type BoardEntry={
 stage:BoardStage;
 business:{name:string;city:string|null;category:string|null;service_area:string|null};
};
export type BoardVisibility={
 showTests:boolean;stage:BoardStage|null;opportunity:string;campaignFilter:string;q:string;
};
export type BoardEntryMeta={
 isTest:boolean;opportunity:string|null;campaignId:string|null;
};

// One definition of the visible business population is used for both the
// counters and the table. The stage filter narrows the table, not its siblings.
export function filterOpportunityBoard<T extends BoardEntry>(
 items:readonly T[],
 stages:readonly BoardStage[],
 filters:BoardVisibility,
 getMeta:(item:T)=>BoardEntryMeta
):{searched:T[];counts:Record<BoardStage,number>;testCount:number}{
 const query=filters.q.trim().toLocaleLowerCase();
 const candidates=items.map(item=>({item,meta:getMeta(item)})).filter(({item,meta})=>{
  if(filters.opportunity&&meta.opportunity!==filters.opportunity)return false;
  if(filters.campaignFilter&&meta.campaignId!==filters.campaignFilter)return false;
  if(query&&![item.business.name,item.business.city,item.business.category,item.business.service_area]
    .some(value=>(value||'').toLocaleLowerCase().includes(query)))return false;
  return true;
 });
 // The toggle count describes hidden tests relevant to the current filters,
 // not unrelated test businesses elsewhere in the CRM.
 const testCount=candidates.filter(x=>x.meta.isTest).length;
 const pool=candidates.filter(x=>filters.showTests||!x.meta.isTest).map(x=>x.item);
 const searched=pool.filter(item=>!filters.stage||item.stage===filters.stage);
 const counts=Object.fromEntries(stages.map(stage=>[
  stage,pool.filter(item=>item.stage===stage).length
 ])) as Record<BoardStage,number>;
 return {searched,counts,testCount};
}
