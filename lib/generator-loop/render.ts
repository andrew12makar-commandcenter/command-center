// Page plan -> self-contained semantic HTML. This is the loop's measurable
// render: the evaluator parses it, and the optional browser pass loads it at
// desktop and mobile widths. It is a test harness render, not the production
// SiteRenderer, so it never ships to clients.
import type {PagePlan,PlanCta,PlanImage,PlanSection} from './compose.ts';

const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cta=(c:PlanCta,cls='')=>`<a class="cta ${c.role} ${cls}" href="${esc(c.href)}" data-placement="${c.placement}">${esc(c.label)}</a>`;
const img=(i:PlanImage)=>`<figure class="media"><img src="${esc(i.src)}" alt="${esc(i.alt)}" loading="lazy" data-origin="${i.origin}">${i.disclosure?`<figcaption>${esc(i.disclosure)}</figcaption>`:''}</figure>`;

function section(s:PlanSection,first:boolean){
 const H=first?'h1':'h2';
 const items=s.items.length?`<ul class="items" style="--cols:${s.columnsDesktop};--cols-m:${s.columnsMobile}">${s.items.map(i=>`<li>${esc(i.text)}</li>`).join('')}</ul>`:'';
 return `<section id="${s.id}" data-kind="${s.kind}" data-reveal="${s.reveal}" class="${s.images.length&&s.columnsDesktop>1?'split':''}">`+
  `<div class="copy"><${H}>${esc(s.heading.text)}</${H}>${s.body.map(b=>`<p>${esc(b.text)}</p>`).join('')}${items}`+
  `${s.ctas.length?`<div class="actions">${s.ctas.map(c=>cta(c)).join('')}</div>`:''}</div>`+
  `${s.images.length?`<div class="gallery" style="--n:${s.images.length}">${s.images.map(img).join('')}</div>`:''}</section>`;
}

export function renderPlanHtml(plan:PagePlan,brand:string){
 const p=plan.palette,t=plan.typography,gap=plan.spacingPx;
 const nav=plan.sections.filter(s=>s.kind!=='hero'&&s.kind!=='contact').slice(0,5);
 const sticky=plan.globalCtas.find(c=>c.placement==='sticky');
 const header=plan.globalCtas.find(c=>c.placement==='header');
 const css=`:root{--bg:${p.bg};--fg:${p.fg};--muted:${p.muted};--accent:${p.accent};--on-accent:${p.onAccent};--surface:${p.surface}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 '${t.body}',system-ui,sans-serif}
h1,h2{font-family:'${t.display}',Georgia,serif;line-height:1.08;margin:0 0 .5em;overflow-wrap:anywhere}
h1{font-size:calc(${(2.2*t.displayScale).toFixed(2)}rem + 2.4vw)}h2{font-size:calc(${(1.4*t.displayScale).toFixed(2)}rem + 1vw)}
p{color:var(--muted);max-width:62ch}.skip{position:absolute;left:-999px}.skip:focus{left:16px;top:16px}
header{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between;padding:16px clamp(16px,4vw,48px)}
nav a{color:var(--fg);margin-right:16px;display:inline-block;min-height:44px;line-height:44px}
section{padding:${gap}px clamp(16px,4vw,48px)}section:nth-of-type(even){background:var(--surface)}
.split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(16px,4vw,48px);align-items:center}
.items{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:12px 24px;padding:0;list-style:none}
.gallery{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:12px}.media{margin:0}.media img{width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;display:block;background:var(--surface)}
figcaption{font-size:13px;color:var(--muted)}
.cta{display:inline-flex;align-items:center;min-height:48px;padding:0 20px;margin:8px 12px 0 0;border-radius:999px;text-decoration:none;font-weight:600}
.cta.primary{background:var(--accent);color:var(--on-accent)}.cta.secondary{border:1px solid var(--fg);color:var(--fg)}
.sticky{position:fixed;left:12px;right:12px;bottom:12px;display:none;justify-content:center;margin:0}
[data-reveal]:not([data-reveal="none"]){transition:opacity ${plan.motion.durationMs}ms ease,transform ${plan.motion.durationMs}ms ease}
@media (max-width:720px){.split{grid-template-columns:1fr}.items{grid-template-columns:repeat(var(--cols-m),minmax(0,1fr))}.gallery{grid-template-columns:1fr}.sticky{display:flex}body{padding-bottom:${sticky?84:0}px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`+
  `<title>${esc(brand)}</title><style>${css}</style></head><body><a class="skip" href="#main">Skip to content</a>`+
  `<header><strong>${esc(brand)}</strong><nav aria-label="Primary">${nav.map(s=>`<a href="#${s.id}">${esc(s.heading.text)}</a>`).join('')}</nav>${header?cta(header):''}</header>`+
  `<main id="main">${plan.sections.map((s,i)=>section(s,i===0)).join('')}</main>`+
  `${sticky?cta(sticky,'sticky'):''}<footer><p>Independent design concept. Not affiliated with or endorsed by this business.</p></footer></body></html>`;
}
