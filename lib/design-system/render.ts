import {renderDesignSystemCss} from './css.ts';
import {domId,resolveRenderOptions} from './options.ts';
import {INTERNAL_DISCLAIMER,TO_CONFIRM,escapeHtml,suppliedText} from './policy.ts';
import {
 renderAbout,renderBooking,renderDisclaimerBanner,renderFooter,renderGallery,renderHero,
 renderHoursLocation,renderReviews,renderServices
} from './sections.ts';
import {defaultServicesHeading,themeFor} from './tokens.ts';
import type {DesignSite,RenderOptions} from './types.ts';

function navigation(links:Array<{href:string;label:string}>):string{
 const items=links.map(link=>`<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join('');
 return `<nav class="ds-header-nav" aria-label="Page">${items}</nav><details class="ds-nav-disclosure"><summary>Menu</summary><nav aria-label="Page menu">${items}</nav></details>`;
}

/** Themed site body. Includes the internal banner and footer disclaimer. */
export function renderSiteFragment(site:DesignSite,options?:RenderOptions):string{
 const resolved=resolveRenderOptions(options);
 const theme=themeFor(site.category);
 const name=suppliedText(site.businessName,200)||TO_CONFIRM;
 const servicesLabel=suppliedText(site.servicesHeading,120)||defaultServicesHeading(site.category);
 const galleryHtml=renderGallery({images:site.gallery,heading:site.galleryHeading},resolved);
 const reviewsHtml=renderReviews({reviews:site.reviews},resolved);
 const links=[
  {href:`#${domId(resolved,'services')}`,label:servicesLabel},
  galleryHtml?{href:`#${domId(resolved,'gallery')}`,label:'Gallery'}:null,
  {href:`#${domId(resolved,'about')}`,label:'About'},
  {href:`#${domId(resolved,'hours')}`,label:'Hours'},
  reviewsHtml?{href:`#${domId(resolved,'reviews')}`,label:'Reviews'}:null,
  {href:`#${domId(resolved,'booking')}`,label:'Book'}
 ].filter((link):link is {href:string;label:string}=>Boolean(link));
 const mainTag=resolved.embed?'div':'main';
 const rootClass=resolved.embed?'ds-site':'ds-site ds-body';
 const skip=resolved.embed?'':`<a class="ds-skip" href="#${domId(resolved,'main')}">Skip to content</a>`;
 return `<div class="${rootClass}" data-theme="${theme.id}" data-motion="${theme.motion}" data-category="${theme.id}">
${skip}
${renderDisclaimerBanner()}
<header class="ds-header"><div class="ds-wrap ds-header-inner"><a class="ds-wordmark" href="#${domId(resolved,'top')}">${escapeHtml(name)}</a>${navigation(links)}</div></header>
<${mainTag} class="ds-main" id="${domId(resolved,'main')}">
${renderHero({businessName:site.businessName,hero:site.hero},resolved)}
${renderServices({category:site.category,items:site.services,heading:site.servicesHeading,note:site.servicesNote},resolved)}
${galleryHtml}
${renderAbout({category:site.category,about:site.about},resolved)}
${renderHoursLocation({hoursLocation:site.hoursLocation},resolved)}
${reviewsHtml}
${renderBooking({booking:site.booking},resolved)}
</${mainTag}>
${renderFooter({businessName:site.businessName,footer:site.footer},resolved)}
</div>`;
}

/** Standalone internal page: noindex, self-hosted CSS, disclaimer in the footer. */
export function renderSite(site:DesignSite,options?:RenderOptions):string{
 const name=suppliedText(site.businessName,200)||TO_CONFIRM;
 const fragment=renderSiteFragment(site,{...options,embed:false});
 const css=renderDesignSystemCss({fontBase:options?.fontBase});
 const title=`${name} — Internal concept`;
 const description=`Internal concept for ${name}. ${INTERNAL_DISCLAIMER}.`;
 return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="description" content="${escapeHtml(description)}">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
</head>
<body>
${fragment}
</body>
</html>
`;
}
