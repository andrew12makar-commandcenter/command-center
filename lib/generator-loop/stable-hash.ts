// Stable, dependency-free hashing for the generator loop. The same logical
// input always produces the same key, whatever the property order, so cached
// evaluations and research can be reused across runs instead of recomputed.

/** JSON with object keys sorted recursively. Undefined values are dropped. */
export function stableStringify(value:unknown):string{
 if(value===null||typeof value!=='object')return JSON.stringify(value)??'null';
 if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
 const entries=Object.entries(value as Record<string,unknown>)
  .filter(([,v])=>v!==undefined)
  .sort(([a],[b])=>a<b?-1:a>b?1:0);
 return '{'+entries.map(([k,v])=>JSON.stringify(k)+':'+stableStringify(v)).join(',')+'}';
}

/** Two independent 32-bit hashes (FNV-1a and Murmur-style mixing) over UTF-16
 *  code units, returned as 16 hex characters. Not cryptographic; collision
 *  resistance is ample for cache keys of a few thousand entries. */
export function stableHash(value:unknown):string{
 const text=typeof value==='string'?value:stableStringify(value);
 let a=0x811c9dc5,b=0x9747b28c;
 for(let i=0;i<text.length;i++){
  const c=text.charCodeAt(i);
  a=Math.imul(a^c,0x01000193);
  b=Math.imul(b^c,0x5bd1e995);b^=b>>>15;
 }
 b=Math.imul(b^(b>>>13),0x5bd1e995);b^=b>>>15;
 return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}

/** Keyed store. The loop only depends on this interface, so the benchmark can
 *  back it with files while tests use memory. */
export type EvaluationCache<T>={get(key:string):T|undefined;set(key:string,value:T):void;readonly size:number;entries():Record<string,T>};

export function memoryCache<T>(seed?:Record<string,T>):EvaluationCache<T>{
 const map=new Map<string,T>(Object.entries(seed??{}));
 return {get:k=>map.get(k),set:(k,v)=>{map.set(k,v);},get size(){return map.size;},entries:()=>Object.fromEntries(map)};
}
