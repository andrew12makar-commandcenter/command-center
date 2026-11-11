// Builds qa/design-system/preview.html from the design-system library.
// Run: node --experimental-strip-types qa/design-system/build-preview.ts

import {writeFileSync} from 'node:fs';
import {INTERNAL_DISCLAIMER,renderDesignSystemCss,renderHoursLocation,renderReviews,renderServices,renderSiteFragment} from '../../lib/design-system/index.ts';
import {exampleSites,missingReview} from './examples.ts';

const CATALOG_CSS=`
body.pv{margin:0;background:#ebe6dc;color:#1c1612;font-family:var(--ds-font-body);font-size:1.0625rem;line-height:1.5}
.pv,.pv *,.pv *::before,.pv *::after{box-sizing:border-box}
.pv-wrap{width:min(1180px,calc(100% - 1.5rem));margin-inline:auto}
.pv-banner{background:#241c18;color:#f6f1e8;text-align:center;font-weight:700;padding:.7rem 1rem;border-bottom:3px solid #7a2e22}
.pv-intro{padding:1.25rem 0 .25rem}
.pv-intro h1{margin:0 0 .4rem;font-family:var(--ds-font-display);font-weight:560;font-size:clamp(2rem,4vw,3.15rem);letter-spacing:-.03em;line-height:.98}
.pv-intro p{margin:.35rem 0;max-width:46rem}
.pv-nav{display:flex;flex-wrap:wrap;gap:.5rem .75rem;padding:.8rem 0 1rem}
.pv-nav a{color:#1c1612;font-weight:700}
.pv-kicker{margin:1.75rem 0 .55rem;font-size:.78rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#7a2e22}
.pv-edge{margin:1.5rem 0 2rem;padding:1rem;border:1px dashed #5c534a;background:#fbf8f2}
.pv-edge h2{margin:.2rem 0 .75rem;font-family:var(--ds-font-display);font-size:1.7rem}
.pv-edge h3{margin:1rem 0 .4rem;font-size:1.05rem}
.pv-out{min-height:2.5rem;margin:0}
@media (max-width:390px){
 .pv-wrap{width:min(1180px,calc(100% - 1.25rem))}
 .pv-intro h1{font-size:2.1rem}
}
`;

export function buildPreviewHtml():string{
 const sites=exampleSites.map(site=>{
  const fragment=renderSiteFragment(site,{idPrefix:site.category,headingBase:2,embed:true});
  return `<article class="pv-example" id="example-${site.category}" aria-label="${site.businessName}, example data">
 <p class="pv-kicker">Example data · ${site.category}</p>
 ${fragment}
</article>`;
 }).join('\n');
 const missingServices=renderServices({category:'barber',items:[]},{idPrefix:'missing-services',headingBase:2});
 const missingHours=renderHoursLocation({hoursLocation:null},{idPrefix:'missing-hours',headingBase:2});
 const missingReviews=renderReviews({reviews:[missingReview]},{idPrefix:'missing-reviews',headingBase:2});
 const css=renderDesignSystemCss({fontBase:'../../lib/design-system/fonts'});
 return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="description" content="Example data for the internal design-system gallery. ${INTERNAL_DISCLAIMER}.">
<title>Design system preview — Internal concept</title>
<style>${css}${CATALOG_CSS}</style>
</head>
<body class="pv">
<div class="pv-banner" role="note">${INTERNAL_DISCLAIMER}</div>
<header class="pv-intro"><div class="pv-wrap">
 <p class="pv-kicker">Example data</p>
 <h1>Design system preview</h1>
 <p>All names, prices, hours, addresses, reviews, and images on this page are example data for the section library. They are not facts about a real business.</p>
 <p>The reviews section is rendered only for the hair studio example, where attributed example reviews are supplied. Other examples omit it.</p>
 <nav class="pv-nav" aria-label="Examples">${exampleSites.map(site=>`<a href="#example-${site.category}">${site.businessName}</a>`).join('')}<a href="#missing-data">Missing data</a></nav>
</div></header>
<main>
${sites}
<section class="pv-wrap pv-edge" id="missing-data" aria-labelledby="missing-data-title">
 <h2 id="missing-data-title">Missing data</h2>
 <p>These blocks call the same components with empty inputs. Example labels above the blocks are catalog chrome, not invented business facts.</p>
 <h3>Services list absent</h3>
 <div class="ds-site" data-theme="barber" data-motion="editorial">${missingServices}</div>
 <h3>Hours and location unknown</h3>
 <div class="ds-site" data-theme="barber" data-motion="editorial">${missingHours}</div>
 <h3>Review without a source</h3>
 <p>The input is example data and is not a real review. The component renders nothing when attribution is incomplete.</p>
 <div id="missing-reviews-output" class="pv-out" data-rendered="reviews">${missingReviews}</div>
</section>
</main>
</body>
</html>
`;
}

const invoked=process.argv[1]?.includes('build-preview.ts')||process.argv[1]?.includes('build-preview.mts');
if(invoked){
 const target=new URL('./preview.html',import.meta.url);
 writeFileSync(target,buildPreviewHtml());
 console.log(`Wrote ${target.pathname}`);
}
