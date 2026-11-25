// In-page audit functions. Each is serialized by Playwright and executed inside
// the rendered customer site, so they must be self-contained (no imports).
// They detect TECHNICAL rendering defects only. None of them measure taste.

export function layoutAudit(){
 const doc=document.documentElement;
 const vw=doc.clientWidth;
 const describe=el=>{
  const id=el.id?'#'+el.id:'';
  const cls=typeof el.className==='string'?el.className.trim().split(/\s+/).slice(0,3).join('.'):'';
  const text=(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,60);
  return `${el.tagName.toLowerCase()}${id}${cls?'.'+cls:''}${text?` "${text}"`:''}`;
 };
 const visible=el=>{
  // checkVisibility also honours closed <details> content, which keeps a
  // layout box in Chromium but is not painted.
  if(el.checkVisibility&&!el.checkVisibility({opacityProperty:true,visibilityProperty:true,contentVisibilityAuto:true}))return false;
  const s=getComputedStyle(el);
  if(s.visibility==='hidden'||s.display==='none'||Number(s.opacity)<0.05)return false;
  const r=el.getBoundingClientRect();
  return r.width>0&&r.height>0;
 };
 const hasOwnText=el=>[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>0);
 const all=[...document.body.querySelectorAll('*')].filter(el=>!['SCRIPT','STYLE','NOSCRIPT','svg','path'].includes(el.tagName));
 const textEls=all.filter(el=>hasOwnText(el)&&visible(el));

 // 1. Page-level horizontal scrolling.
 const pageOverflow=doc.scrollWidth-vw;

 // 2. Text cut off by any clipping ancestor (including the site wrapper's
 // overflow-hidden, which would silently hide content past the viewport edge).
 const clipped=[];
 for(const el of textEls){
  const r=el.getBoundingClientRect();
  if(r.right>vw+2||r.left<-2){clipped.push({element:describe(el),overflowPx:Math.round(Math.max(r.right-vw,-r.left))});continue;}
  const s=getComputedStyle(el);
  if((s.overflowX!=='visible'&&el.scrollWidth>el.clientWidth+2)||(s.overflowY!=='visible'&&el.scrollHeight>el.clientHeight+2&&s.webkitLineClamp==='none')){
   clipped.push({element:describe(el),overflowPx:Math.max(el.scrollWidth-el.clientWidth,el.scrollHeight-el.clientHeight)});continue;
  }
  for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){
   const as=getComputedStyle(a);
   if(as.overflowX==='visible'&&as.overflowY==='visible')continue;
   const ar=a.getBoundingClientRect();
   const out=Math.max(ar.left-r.left,r.right-ar.right,as.overflowY==='visible'?0:Math.max(ar.top-r.top,r.bottom-ar.bottom));
   if(out>2){clipped.push({element:describe(el),overflowPx:Math.round(out),clippedBy:describe(a).slice(0,80)});break;}
  }
 }

 // 3. Text drawn on top of other text (not nested in each other).
 const overlaps=[];
 const boxes=textEls.map(el=>({el,r:el.getBoundingClientRect()}));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j];
  if(a.el.contains(b.el)||b.el.contains(a.el))continue;
  const w=Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left);
  const h=Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top);
  if(w<=2||h<=2)continue;
  const area=w*h,smaller=Math.min(a.r.width*a.r.height,b.r.width*b.r.height);
  if(area>40&&area/smaller>0.15)overlaps.push({a:describe(a.el),b:describe(b.el),overlapPx:Math.round(area)});
  if(overlaps.length>=20)break;
 }

 // 4. Broken or badly upscaled images.
 const images=[...document.images].map(img=>{
  const r=img.getBoundingClientRect();
  return {src:img.currentSrc||img.src,alt:img.getAttribute('alt'),broken:img.complete&&img.naturalWidth===0,
   upscale:img.naturalWidth?+(r.width*devicePixelRatio/img.naturalWidth).toFixed(2):null};
 });

 // 5. Links: in-page anchors must resolve; record every CTA destination.
 const links=[...document.querySelectorAll('a[href]')].map(a=>{
  const href=a.getAttribute('href')||'';
  const r=a.getBoundingClientRect();
  return {text:(a.textContent||'').trim().replace(/\s+/g,' ').slice(0,60),href,
   hashTargetMissing:href.startsWith('#')&&href.length>1&&!document.getElementById(decodeURIComponent(href.slice(1))),
   empty:href===''||href==='#',visible:visible(a),width:Math.round(r.width),height:Math.round(r.height)};
 });

 // 6. Tiny type and tap targets matter most on phones.
 const smallText=textEls.filter(el=>parseFloat(getComputedStyle(el).fontSize)<12).map(el=>({element:describe(el),fontSize:getComputedStyle(el).fontSize})).slice(0,15);

 return {viewportWidth:vw,pageOverflow,clipped:clipped.slice(0,20),overlaps,images,links,smallText,
  documentHeight:doc.scrollHeight,
  sections:[...document.querySelectorAll('header,section,footer')].map(s=>({tag:s.tagName.toLowerCase(),id:s.id||null,layout:s.dataset.servicesLayout||null,
   top:Math.round(s.getBoundingClientRect().top+scrollY),height:Math.round(s.getBoundingClientRect().height)}))};
}

// Essential content above the fold: business identity, H1 and one action.
export function foldAudit(){
 const vh=innerHeight,vw=innerWidth;
 const inView=el=>{
  if(!el)return false;
  if(el.checkVisibility&&!el.checkVisibility({visibilityProperty:true,contentVisibilityAuto:true}))return false;
  const s=getComputedStyle(el);
  if(s.visibility==='hidden'||s.display==='none')return false;
  const r=el.getBoundingClientRect();
  return r.width>0&&r.height>0&&r.top<vh&&r.bottom>0&&r.left<vw&&r.right>0;
 };
 const opacity=el=>{let o=1;for(let a=el;a;a=a.parentElement)o*=Number(getComputedStyle(a).opacity);return +o.toFixed(2);};
 const h1=document.querySelector('h1');
 const brand=document.querySelector('header a');
 const actions=[...document.querySelectorAll('a[href]')].filter(a=>/^(https?:|tel:|mailto:|#contact)/.test(a.getAttribute('href')||'')&&inView(a));
 const nav=document.querySelector('header nav');
 const menuButton=document.querySelector('header button[aria-expanded],header [aria-controls],header details > summary');
 return {h1Text:h1?.textContent?.trim().slice(0,120)||null,h1Visible:inView(h1),h1Opacity:h1?opacity(h1):0,
  h1Bottom:h1?Math.round(h1.getBoundingClientRect().bottom):null,
  brandVisible:inView(brand),actionInFold:actions.length>0,
  navVisible:inView(nav),menuButton:Boolean(menuButton)};
}

// After scrolling a section into view, everything inside must have finished
// revealing. Animations must never leave essential content transparent.
export function revealAudit(sectionId){
 const section=document.getElementById(sectionId);
 if(!section)return null;
 const opacity=el=>{let o=1;for(let a=el;a;a=a.parentElement)o*=Number(getComputedStyle(a).opacity);return o;};
 const vh=innerHeight;
 const targets=[section,...section.querySelectorAll('h2,h3,p,a,img,article')].filter(el=>{
  const r=el.getBoundingClientRect();return r.height>0&&r.top<vh*0.6&&r.bottom>vh*0.1&&(!el.checkVisibility||el.checkVisibility({contentVisibilityAuto:true}));
 });
 // Text must be readable. Media may still be finishing a reveal, but must not
 // sit mostly transparent while it is on screen.
 const faded=targets.filter(el=>opacity(el)<(['IMG','ARTICLE'].includes(el.tagName)?0.5:0.85)).map(el=>({tag:el.tagName.toLowerCase(),text:(el.textContent||'').trim().slice(0,50),opacity:+opacity(el).toFixed(2)}));
 return {checked:targets.length,faded:faded.slice(0,10)};
}

export function reducedMotionAudit(){
 const running=document.getAnimations().filter(a=>{
  const t=a.effect?.getComputedTiming?.();
  return a.playState==='running'&&t&&Number(t.duration)>50;
 }).length;
 const hidden=[...document.querySelectorAll('[class*="motion-"]')].filter(el=>Number(getComputedStyle(el).opacity)<0.99).length;
 return {runningAnimations:running,transparentMotionElements:hidden};
}

// Coarse structural fingerprint used to detect "same layout, different words".
export function structureSignature(){
 const root=document.querySelector('.site-motion');
 const hero=document.querySelector('header + *');
 return {
  composition:[...(root?.classList||[])].find(c=>c.startsWith('composition-'))||null,
  order:[...document.querySelectorAll('section[id]')].map(s=>s.id+(s.dataset.servicesLayout?':'+s.dataset.servicesLayout:'')),
  heroColumns:hero?getComputedStyle(hero.querySelector('[class*="grid"]')||hero).gridTemplateColumns.split(' ').length:0,
  heroImage:Boolean(hero?.querySelector('img'))
 };
}

// Downscale a screenshot to a small grayscale grid inside the browser so no
// image library is needed. Used only as a coarse near-duplicate signal.
export async function thumbnail(dataUrl){
 const img=new Image();img.src=dataUrl;await img.decode();
 const c=document.createElement('canvas');c.width=48;c.height=30;
 const g=c.getContext('2d');g.drawImage(img,0,0,48,30);
 const d=g.getImageData(0,0,48,30).data;const out=[];
 for(let i=0;i<d.length;i+=4)out.push(Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]));
 return out;
}
