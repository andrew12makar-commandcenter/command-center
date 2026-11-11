import type {RenderOptions} from './types.ts';

export type ResolvedRender={
 prefix:string;
 headingBase:1|2;
 embed:boolean;
};

export function sanitizeIdPrefix(value:string|undefined):string{
 const raw=(value??'site').trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-');
 const prefix=raw||'site';
 return /^[a-z]/.test(prefix)?prefix:`s-${prefix}`;
}

export function resolveRenderOptions(options?:RenderOptions):ResolvedRender{
 const carried=options as (RenderOptions&{prefix?:string})|undefined;
 return {
  prefix:sanitizeIdPrefix(carried?.prefix??carried?.idPrefix),
  headingBase:options?.headingBase===2?2:1,
  embed:Boolean(options?.embed)
 };
}

export function domId(resolved:ResolvedRender,part:string):string{
 return `${resolved.prefix}-${part}`;
}

export function headingTag(resolved:ResolvedRender,rank:1|2|3):'h1'|'h2'|'h3'|'h4'|'h5'|'h6'{
 const level=Math.min(6,resolved.headingBase+rank-1);
 return `h${level}` as 'h1'|'h2'|'h3'|'h4'|'h5'|'h6';
}
