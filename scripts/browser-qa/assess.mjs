// Pure classification of raw browser observations into technical findings.
// Kept free of Playwright so it can be unit tested deterministically.

export const severities=['blocking','warning'];

export function assessViewport(obs){
 const f=[];
 const add=(severity,code,detail)=>f.push({severity,code,detail});
 const {layout,fold,reveal=[],reduced,console:logs={errors:[],pageErrors:[],failedRequests:[]},axe=[],viewport,nav}=obs;

 for(const e of logs.pageErrors)add('blocking','runtime-exception',e);
 for(const e of logs.errors)add('blocking','console-error',e);
 for(const r of logs.failedRequests)add('blocking','failed-request',r);

 if(layout.pageOverflow>1)add('blocking','horizontal-overflow',`Page scrolls ${layout.pageOverflow}px sideways at ${layout.viewportWidth}px.`);
 for(const c of layout.clipped)add('blocking','clipped-text',`${c.element} cut off by ${c.overflowPx}px${c.clippedBy?' in '+c.clippedBy:''}`);
 for(const o of layout.overlaps)add('blocking','overlapping-text',`${o.a} overlaps ${o.b}`);
 for(const img of layout.images){
  if(img.broken)add('blocking','broken-image',img.src);
  else if(img.upscale&&img.upscale>1.6)add('warning','upscaled-image',`${img.src} displayed at ${img.upscale}x its pixel size`);
 }
 for(const l of layout.links){
  if(l.hashTargetMissing)add('blocking','broken-anchor',`"${l.text}" → ${l.href}`);
  if(l.empty)add('blocking','empty-link',`"${l.text}" has no destination`);
  if(viewport.mobile&&l.visible&&(l.height<24||l.width<24))add('warning','small-tap-target',`"${l.text||l.href}" is ${l.width}×${l.height}px`);
 }
 if(viewport.mobile)for(const s of layout.smallText)add('warning','small-text',`${s.element} at ${s.fontSize}`);

 if(!fold.h1Visible)add('blocking','h1-not-in-first-screen','The main headline is not visible without scrolling.');
 else if(fold.h1Opacity<0.85)add('blocking','h1-transparent',`Main headline opacity ${fold.h1Opacity} after load.`);
 if(!fold.brandVisible)add('blocking','brand-not-visible','Business name is not visible in the header.');
 if(!fold.actionInFold)add('blocking','no-action-in-first-screen','No contact, booking or call action is visible on load.');
 if(viewport.mobile&&!fold.navVisible&&!fold.menuButton)add('warning','mobile-navigation-missing','Section navigation is hidden on this width and there is no menu control.');

 for(const r of reveal)if(r&&r.faded.length)add('blocking','content-hidden-by-animation',`#${r.section}: ${r.faded.map(x=>`${x.tag} "${x.text}" at ${x.opacity}`).join('; ')}`);
 if(nav)for(const n of nav)if(!n.reached)add('blocking','navigation-did-not-scroll',`"${n.text}" did not bring ${n.href} into view`);

 if(reduced){
  if(reduced.runningAnimations>0)add('blocking','reduced-motion-ignored',`${reduced.runningAnimations} animation(s) still running with reduced motion requested.`);
  if(reduced.transparentMotionElements>0)add('blocking','reduced-motion-hidden-content',`${reduced.transparentMotionElements} element(s) stay transparent with reduced motion.`);
 }
 for(const v of axe){
  const sev=v.impact==='critical'||v.impact==='serious'?'blocking':'warning';
  add(sev,'axe:'+v.id,`${v.impact}: ${v.help} (${v.nodes} element${v.nodes===1?'':'s'}: ${v.targets.join(', ')})`);
 }
 return f;
}

export function summarize(findings){
 return {
  blocking:findings.filter(x=>x.severity==='blocking').length,
  warning:findings.filter(x=>x.severity==='warning').length,
  codes:[...new Set(findings.map(x=>x.code))].sort()
 };
}

// Coarse similarity of two grayscale thumbnails, 0 (different) .. 1 (identical).
export function thumbnailSimilarity(a,b){
 if(!a?.length||a.length!==b?.length)return 0;
 const mean=x=>x.reduce((s,v)=>s+v,0)/x.length;
 const ma=mean(a),mb=mean(b);
 // Compare luminance STRUCTURE (mean-centered) so colour scheme changes alone
 // do not make two identical layouts look different.
 let num=0,da=0,db=0;
 for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;num+=x*y;da+=x*x;db+=y*y;}
 if(da===0||db===0)return da===db?1:0;
 return +Math.max(0,num/Math.sqrt(da*db)).toFixed(3);
}

export function sameStructure(a,b){
 return a.composition===b.composition&&a.heroColumns===b.heroColumns&&a.heroImage===b.heroImage&&
  a.order.join('|')===b.order.join('|');
}

// Flags pairs that look like the same template with different words. This is a
// technical repetition signal for reviewers, not an aesthetic judgement.
export function repetitionFindings(sites,threshold=0.9){
 const out=[];
 for(let i=0;i<sites.length;i++)for(let j=i+1;j<sites.length;j++){
  const a=sites[i],b=sites[j];
  const visual=thumbnailSimilarity(a.thumbnail,b.thumbnail);
  const structural=sameStructure(a.signature,b.signature);
  if(structural||visual>=threshold)out.push({a:a.id,b:b.id,visualSimilarity:visual,sameStructure:structural,
   severity:structural&&visual>=threshold?'warning':'note'});
 }
 return out;
}
