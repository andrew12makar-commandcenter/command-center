export type AuditEngine='local'|'remote'|'manual';

export function preferredAuditEngine(isDevelopment:boolean,hasPageSpeedKey:boolean):AuditEngine{
 // On the operator's Mac, avoid Google PageSpeed API rate limits entirely.
 if(isDevelopment)return 'local';
 // Never make an anonymous quota-consuming Google request in production.
 return hasPageSpeedKey?'remote':'manual';
}

export function completedAuditOnCooldown(
 latest:{status:string;assessed_at:string}|null|undefined,
 now=Date.now()
):boolean{
 if(!latest||latest.status==='inconclusive')return false;
 const age=now-Date.parse(latest.assessed_at);
 return Number.isFinite(age)&&age>=0&&age<20*60_000;
}

export function remoteProviderQuotaFailure(status:string,error:string|null|undefined):boolean{
 return status==='inconclusive'&&/HTTP (?:401|403|429)\b/.test(error??'');
}
