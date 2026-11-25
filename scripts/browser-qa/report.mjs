// Writes the browser QA run as machine-readable JSON, a Markdown summary and a
// screenshot contact sheet for the human design review.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export function markdown(report){
 const lines=[`# Browser QA report`,'',`Created ${report.createdAt} · ${report.browser}`,'',`> ${report.scope}`,'',
  `**Totals:** ${report.totals.blocking} blocking, ${report.totals.warning} warning findings.`,'',
  '| Site | Category | Desktop | Tablet | Mobile | Lighthouse (lab, local) |','|---|---|---|---|---|---|'];
 for(const s of report.sites){
  const cell=vp=>{const v=s.viewports.find(x=>x.viewport===vp);return v?`${v.summary.blocking} blocking / ${v.summary.warning} warn`:'n/a';};
  const lh=s.lighthouse?.status==='measured'?Object.entries(s.lighthouse.scores).map(([k,v])=>`${k} ${v}`).join(', '):s.lighthouse?.status||'not run';
  lines.push(`| ${s.name} (\`${s.id}\`) | ${s.category} | ${cell('desktop')} | ${cell('tablet')} | ${cell('mobile')} | ${lh} |`);
 }
 lines.push('','## Layout repetition signal','',
  'Pairs with an identical section structure or near-identical first-screen luminance pattern. This flags possible template reuse for reviewers; it is not a design score.','');
 if(!report.repetition.length)lines.push('No near-duplicate pairs detected.');
 for(const r of report.repetition)lines.push(`- ${r.a} ↔ ${r.b}: visual similarity ${r.visualSimilarity}, same structure ${r.sameStructure ? 'yes':'no'} (${r.severity})`);
 for(const s of report.sites){
  lines.push('',`## ${s.name}`,'',`\`${s.id}\` · ${s.category} · template ${s.vertical}${s.holdout?' · holdout':''}`,'');
  const sig=s.viewports[0]?.signature;
  if(sig)lines.push(`Structure: ${sig.composition}; sections ${sig.order.join(' → ')}; hero image ${sig.heroImage?'yes':'no'}.`,'');
  for(const v of s.viewports){
   lines.push(`### ${v.viewport} (${v.width}×${v.height})`,'',`Screenshots: [first screen](${v.screenshots.fold}) · [full page](${v.screenshots.full})`,'');
   if(!v.findings.length)lines.push('No technical findings.','');
   else{for(const f of v.findings)lines.push(`- **${f.severity}** \`${f.code}\` ${f.detail}`);lines.push('');}
  }
  lines.push('**Human visual review:** not yet recorded. Review against docs/VISUAL_REVIEW_RUBRIC.md before any client use.');
 }
 return lines.join('\n')+'\n';
}

export function contactSheet(report){
 const rows=report.sites.map(s=>`<section><h2>${esc(s.name)} <small>${esc(s.category)} · ${esc(s.id)}</small></h2><div class="row">${
  s.viewports.map(v=>`<figure><a href="${esc(v.screenshots.full)}"><img loading="lazy" src="${esc(v.screenshots.fold)}" alt="${esc(s.name)} ${esc(v.viewport)} first screen"></a><figcaption>${esc(v.viewport)} · ${v.summary.blocking} blocking · ${v.summary.warning} warning</figcaption></figure>`).join('')
 }</div></section>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Browser QA contact sheet</title>
<style>body{font:14px/1.5 system-ui,sans-serif;margin:0;padding:24px;background:#f4f4f2;color:#1b1b1b}h1{margin:0 0 4px}p{color:#555;max-width:70ch}section{margin:32px 0}h2{font-size:18px}small{color:#777;font-weight:400}.row{display:flex;gap:16px;align-items:flex-start;overflow-x:auto}figure{margin:0;background:#fff;padding:8px;border:1px solid #ddd}figure img{display:block;max-height:420px;width:auto;max-width:520px}figcaption{font-size:12px;color:#555;margin-top:6px}</style></head>
<body><h1>Browser QA contact sheet</h1><p>${esc(report.scope)} Click a first-screen capture to open its full-page screenshot.</p>${rows}</body></html>`;
}

export async function writeReports(dir,report){
 await writeFile(join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
 await writeFile(join(dir,'report.md'),markdown(report));
 await writeFile(join(dir,'index.html'),contactSheet(report));
}
