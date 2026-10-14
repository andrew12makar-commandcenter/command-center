// Pure decisions used by the staged lead import recovery flow. These checks
// do not mutate CRM data or assume several PostgREST calls form a transaction.
import {normalizeBusiness} from './csv.ts';

export type RecoveryStage={
 id:string;name:string|null;matched_business_id:string|null;review_status:string;
};
export type RecoveryBusiness={id:string;name:string};

export function importRecoveryDecision(row:RecoveryStage,business:RecoveryBusiness|null):
 'create'|'resume'|'blocked'{
 if(row.review_status!=='pending')return 'blocked';
 // New imports use the staging row UUID as their CRM UUID. PostgreSQL's
 // existing businesses primary key then prevents two parallel inserts for one
 // staging row, without requiring a new migration.
 const linkedId=row.matched_business_id||(
  business?.id===row.id?row.id:null);
 if(!linkedId)return business?'blocked':'create';
 if(!business||business.id!==linkedId)return 'blocked';
 const name=normalizeBusiness(row.name||''),existing=normalizeBusiness(business.name||'');
 // A stale or manually reassigned link is never permission to edit another CRM lead.
 return name.length>=3&&name===existing?'resume':'blocked';
}

export type SourceEvidence={source_type:string;source_url:string|null};
export function missingImportEvidence<T extends SourceEvidence>(
 desired:readonly T[],existing:readonly SourceEvidence[]
):T[]{
 const key=(x:SourceEvidence)=>x.source_type+'\u0000'+(x.source_url||'');
 const seen=new Set(existing.map(key));
 return desired.filter(x=>{
  const k=key(x);
  if(seen.has(k))return false;
  seen.add(k);
  return true;
 });
}
