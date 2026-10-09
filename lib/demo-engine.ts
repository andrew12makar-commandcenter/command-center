// Deterministic, auditable template selection. This is feedback-based optimization, not AI fine-tuning.
export const templates = ['landscaping','medical','universal'] as const;
export type Template = typeof templates[number];
export const variants = ['editorial','bold'] as const;
export type Variant = typeof variants[number];

export type DemoCopy = {
 brand: string; eyebrow: string; headline: string; description: string;
 services: string[]; primaryAction: string; secondaryAction: string;
 disclaimer: string; category: string;
};
export function createDraft(name:string, city:string|null, category:string|null, template:Template):DemoCopy {
 const headlines:Record<Template,string> = {
   landscaping:'Outdoor spaces worth coming home to.',
   medical:'Care starts with a clearer first step.',
   universal:'A better way to meet your next customer.',
 };
 const intros:Record<Template,string> = {
   landscaping:'See the possibilities for your outdoor project. Services and availability will be confirmed with the business.',
   medical:'Find the information you need before reaching out. Clinical services and provider details require confirmation.',
   universal:'Explore a modern online introduction to this business. Exact offerings and availability will be confirmed.',
 };
 return {
   brand:name,
   eyebrow:city ? `SERVING ${city.toUpperCase()}` : 'LOCAL BUSINESS',
   headline:headlines[template],
   description:intros[template],
   services:[],
   category:category || 'Services',
   primaryAction:template==='medical'?'Get in touch':'Request information',
   secondaryAction:'Explore services',
   disclaimer:'Independent design concept. Not affiliated with or endorsed by this business. Details require owner confirmation.',
 };
}
export type FeedbackSample={demo_id:string;user_id:string;visual_variant:string;rating:number};
export function chooseVariant(samples:FeedbackSample[]):Variant {
  // 5 unique demo/user evaluations for each variant before using feedback to shift the default.
  // This avoids one test vote controlling a whole template.
  const sets = new Map<Variant,FeedbackSample[]>([['editorial',[]],['bold',[]]]);
  const seen=new Set<string>();
  for (const x of samples) {
    if(!variants.includes(x.visual_variant as Variant)||!Number.isInteger(x.rating)) continue;
    const key=x.demo_id+':'+x.user_id;
    if(seen.has(key)) continue;
    seen.add(key);
    sets.get(x.visual_variant as Variant)?.push(x);
  }
  const base=sets.get('editorial')!, alt=sets.get('bold')!;
  if(base.length<5||alt.length<5) return 'editorial';
  // Smoothed average to avoid instability from small amounts of feedback.
  const average=(xs:FeedbackSample[]) => (15+xs.reduce((a,x)=>a+x.rating,0))/(5+xs.length);
  return average(alt)>average(base)+0.2 ? 'bold' : 'editorial';
}
