// Server-action failures return to the same queue view with a readable, card-level message
// instead of replacing the page with an error screen.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function safeQueueReturn(raw:string):string{
 return raw.startsWith('/app/leads/import')&&!raw.startsWith('//')?raw:'/app/leads/import';
}
export function errorReturnUrl(returnTo:string,rowId:string,message:string):string{
 const url=new URL(safeQueueReturn(returnTo),'http://local');
 url.searchParams.set('err',(message||'The action could not be completed.').slice(0,220));
 if(uuid.test(rowId))url.searchParams.set('row',rowId);else url.searchParams.delete('row');
 url.hash='';
 return url.pathname+url.search+(uuid.test(rowId)?'#row-'+rowId:'');
}
