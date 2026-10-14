// Pure decisions used by the staged lead import recovery flow. These checks
// do not mutate CRM data or assume several PostgREST calls form a transaction.
import {normalizeBusiness} from './csv.ts';
import {createHash} from 'node:crypto';

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
 return name.length>=2&&name===existing?'resume':'blocked';
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

/**
 * Stable UUID v8 (application-defined format) for a source from one staging row.
 * PostgreSQL already enforces business_sources.id uniqueness. This stops two
 * concurrent retries of the same row from creating different source-record IDs.
 * It does NOT create a cross-row uniqueness constraint or a SQL transaction.
 */
export function deterministicSourceId(stagingId:string,sourceType:string,sourceUrl:string):string{
 const h=createHash('sha256').update('command-center:staged-source:v1\0')
  .update(stagingId.toLowerCase()).update('\0').update(sourceType)
  .update('\0').update(sourceUrl).digest('hex').slice(0,32).split('');
 h[12]='8'; // RFC 9562 custom UUID version 8
 h[16]='89ab'[parseInt(h[16],16)%4]; // RFC variant
 const value=h.join('');
 return value.slice(0,8)+'-'+value.slice(8,12)+'-'+value.slice(12,16)+'-'+value.slice(16,20)+'-'+value.slice(20);
}
