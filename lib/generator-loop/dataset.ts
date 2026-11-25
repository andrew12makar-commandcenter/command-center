// Review records and a training-dataset export.
//
// A ReviewRecord is the full account of one review: the business traits, the
// design that was rendered, the reviewer's exact statements with their
// classification, every proposed adjustment with its measured before/after
// and outcome, the alternatives tried, authorization state, motion spec and
// generator version. Nothing here trains a model. The JSONL export is a clean
// dataset that could later support fine-tuning or preference optimisation.
//
// The export removes: secrets and tokens, CRM/internal notes (never copied in),
// personal information (emails, phone numbers, street addresses, people's
// names), and unlicensed content (business image URLs without a covering
// authorization). Business names are replaced with a stable pseudonym.
import type {BusinessTraits,DesignCandidate} from './design-space.ts';
import type {Statement,Signal} from './feedback-interpreter.ts';
import type {Decision,LoopResult} from './loop.ts';
import type {PagePlan} from './compose.ts';
import {stableHash} from './stable-hash.ts';

export const DATASET_SCHEMA='cc-generator-review/v1';

export type ReviewRecord={
 schema:typeof DATASET_SCHEMA;
 recordId:string;generatorVersion:string;evaluatorVersion:string;
 split:'train'|'dev'|'holdout';
 business:{id:string;name:string;industry:string;traits:BusinessTraits;factCount:number;sourced:boolean};
 rendered:{revisionId:string;design:DesignCandidate;motion:PagePlan['motion'];structural:number};
 review:{rating:number|null;style:string|null;text:string;statements:(Statement&{signals:Pick<Signal,'dimension'|'op'|'value'|'prior'|'scope'|'strength'>[]})[]};
 adjustments:(Pick<Decision,'dimension'|'prior'|'revised'|'source'|'outcome'|'reason'|'structuralBefore'|'structuralAfter'|'alignmentBefore'|'alignmentAfter'|'metricDeltas'|'renderBefore'|'renderAfter'>)[];
 alternatives:LoopResult['alternatives'];
 final:{design:DesignCandidate;revisionId:string;structural:number;humanRating:number|null};
 authorization:{generatedImagesAllowed:boolean;businessImagesAuthorizedHost:string|null;businessImagesUsed:number;businessImagesWithheld:number};
 /** Internal notes are never part of a record; kept only as an explicit empty marker. */
 internalNotes?:never;
};

const secretPatterns=[/\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}\b/g,/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g,
 /\b(ghp|gho|github_pat)_[A-Za-z0-9_]{12,}\b/g,/\bAKIA[0-9A-Z]{16}\b/g,/\b(api[_-]?key|secret|token|password)\s*[:=]\s*\S+/gi,/\bsb_(secret|publishable)_[A-Za-z0-9_-]{8,}\b/g];
const emailPattern=/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const phonePattern=/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const streetPattern=/\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Rd|Road|Ave|Avenue|Ln|Lane|Blvd|Way|Dr|Drive|Ct|Pl|Neck|Loop)\b\.?/g;

export type RedactionContext={names:string[];businessName:string};
export function redactText(text:string,ctx:RedactionContext){
 let out=text;
 for(const p of secretPatterns)out=out.replace(p,'[secret]');
 out=out.replace(emailPattern,'[email]').replace(phonePattern,'[phone]').replace(streetPattern,'[address]');
 const names=[...ctx.names].filter(n=>n.trim().length>=3).sort((a,b)=>b.length-a.length);
 for(const n of names){
  const core=n.replace(/^(dr\.?\s+)/i,'').replace(/,.*$/,'').trim();
  for(const v of [n,core,...core.split(/\s+/).filter(p=>p.length>=3&&/^[A-Z]/.test(p))])
   out=out.split(v).join('[person]');
 }
 if(ctx.businessName)out=out.split(ctx.businessName).join('[business]');
 return out;
}

/** JSONL export: one redacted record per line. */
export function exportDataset(records:ReviewRecord[],people:Record<string,string[]>={}):string{
 return records.map(r=>{
  const ctx={names:people[r.business.id]??[],businessName:r.business.name};
  const clean:ReviewRecord={...r,
   business:{...r.business,id:'b_'+stableHash(['pseudonym',r.business.id]).slice(0,10),name:'[business]'},
   review:{...r.review,text:redactText(r.review.text,ctx),
    statements:r.review.statements.map(s=>({...s,text:redactText(s.text,ctx)}))},
   adjustments:r.adjustments.map(a=>({...a,reason:redactText(a.reason,ctx)})),
   alternatives:r.alternatives.map(a=>({...a,reason:redactText(a.reason,ctx)})),
  };
  delete (clean as Record<string,unknown>).internalNotes;
  return JSON.stringify(clean);
 }).join('\n')+(records.length?'\n':'');
}

/** Lint an exported line: fails if anything that should be gone is present. */
export function auditExportLine(line:string,forbidden:string[]=[]):string[]{
 const problems:string[]=[];
 if(emailPattern.test(line))problems.push('email address');
 emailPattern.lastIndex=0;
 if(/\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/.test(line))problems.push('phone number');
 for(const p of secretPatterns){p.lastIndex=0;if(p.test(line))problems.push('secret');p.lastIndex=0;}
 if(/https?:\/\/(?!\/concepts\/)[^"\s]+\.(jpe?g|png|webp|gif)/i.test(line))problems.push('third-party image URL');
 for(const f of forbidden)if(f&&line.includes(f))problems.push(`forbidden text: ${f.slice(0,24)}`);
 return problems;
}
