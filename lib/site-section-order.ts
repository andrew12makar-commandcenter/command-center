// Explicit ordering for sections that the customer-site renderer can actually
// display. Unsupported research-only sections are ignored, never invented.
export const sectionKeys=['services','about','process','gallery','contact'] as const;
export type SectionKey=(typeof sectionKeys)[number];

export function orderRenderableSections(
 requested:readonly string[]|null|undefined,
 available:readonly SectionKey[] = sectionKeys
):SectionKey[]{
 const present=new Set(available);
 const seen=new Set<SectionKey>();
 const explicit:SectionKey[]=[];
 for(const name of requested??[]){
  if(!sectionKeys.includes(name as SectionKey))continue;
  const key=name as SectionKey;
  if(present.has(key)&&!seen.has(key)){explicit.push(key);seen.add(key);}
 }
 const remaining=available.filter(key=>!seen.has(key));
 if(!explicit.length)return [...available];
 // Existing template orders finish with contact but omit some optional modules.
 // Keep those modules before the closing contact section by default.
 if(explicit.at(-1)==='contact'&&remaining.length){
  explicit.splice(explicit.length-1,0,...remaining);
  return explicit;
 }
 return [...explicit,...remaining];
}
