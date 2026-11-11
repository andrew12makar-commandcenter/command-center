// One stylesheet for every category. Color, type, space, radius, and motion
// come from tokens. Font files are self-hosted; remote font URLs are rejected.

import {BUSINESS_CATEGORIES,FONT_FILES,SPACE,TYPE_SCALE,themeFor} from './tokens.ts';

const UNICODE_RANGE='U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

export function resolveFontBase(input?:string):string{
 const base=(input??'./fonts').trim().replace(/\/+$/,'');
 if(!/^(?:\.\.?\/)*(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/.test(base))
  throw new Error('fontBase must be a relative path to the self-hosted font directory');
 return base;
}

function themeBlocks():string{
 return BUSINESS_CATEGORIES.map(id=>{
  const theme=themeFor(id);
  const c=theme.colors;
  return `[data-theme="${id}"]{
 --ds-paper:${c.paper};--ds-paper-deep:${c.paperDeep};--ds-card:${c.card};
 --ds-ink:${c.ink};--ds-muted:${c.muted};--ds-line:${c.line};
 --ds-accent:${c.accent};--ds-accent-hover:${c.accentHover};--ds-on-accent:${c.onAccent};
 --ds-banner:${c.banner};--ds-banner-text:${c.bannerText};
 --ds-on-ink:${c.onInk};--ds-on-ink-muted:${c.onInkMuted};--ds-accent-on-ink:${c.accentOnInk};
 --ds-focus:${c.focus};--ds-radius:${theme.radius};--ds-display-weight:${theme.displayWeight};
}`;
 }).join('\n');
}

export function renderDesignSystemCss(options?:{fontBase?:string}):string{
 const base=resolveFontBase(options?.fontBase);
 const display=`${base}/${FONT_FILES.display}`;
 const body=`${base}/${FONT_FILES.body}`;
 return `/* Small-business design system. Self-hosted Fraunces and Source Sans 3 (SIL OFL). No remote assets. */
@font-face{font-family:"Fraunces";font-style:normal;font-weight:100 900;font-display:swap;src:url("${display}") format("woff2");unicode-range:${UNICODE_RANGE};}
@font-face{font-family:"Source Sans 3";font-style:normal;font-weight:200 900;font-display:swap;src:url("${body}") format("woff2");unicode-range:${UNICODE_RANGE};}
:root{
 --ds-font-display:"Fraunces","Iowan Old Style",Palatino,Georgia,serif;
 --ds-font-body:"Source Sans 3","Segoe UI",system-ui,sans-serif;
 --ds-type-display:${TYPE_SCALE.display};
 --ds-type-title:${TYPE_SCALE.title};
 --ds-type-heading:${TYPE_SCALE.heading};
 --ds-type-body:${TYPE_SCALE.body};
 --ds-type-small:${TYPE_SCALE.small};
 --ds-type-eyebrow:${TYPE_SCALE.eyebrow};
 --ds-leading-body:${TYPE_SCALE.lineBody};
 --ds-leading-display:${TYPE_SCALE.lineDisplay};
 --ds-tracking-display:${TYPE_SCALE.trackingDisplay};
 --ds-tracking-eyebrow:${TYPE_SCALE.trackingEyebrow};
 --ds-space-3xs:${SPACE['3xs']};--ds-space-2xs:${SPACE['2xs']};--ds-space-xs:${SPACE.xs};
 --ds-space-sm:${SPACE.sm};--ds-space-md:${SPACE.md};--ds-space-lg:${SPACE.lg};
 --ds-space-xl:${SPACE.xl};--ds-space-2xl:${SPACE['2xl']};
 --ds-section:${SPACE.section};--ds-wrap:${SPACE.wrap};--ds-gutter:${SPACE.gutter};
 --ds-banner-offset:2.75rem;
 --ds-focus:#1c1612;
}
${themeBlocks()}
html{scroll-behavior:smooth}
.ds-site,.ds-site *,.ds-site *::before,.ds-site *::after{box-sizing:border-box}
.ds-site{color:var(--ds-ink);background:
 radial-gradient(ellipse at top,rgb(255 255 255 / 55%),transparent 42%),
 var(--ds-paper);
 font-family:var(--ds-font-body);font-size:var(--ds-type-body);line-height:var(--ds-leading-body);
 overflow-wrap:anywhere}
.ds-body{min-height:100vh;scroll-padding-top:calc(var(--ds-banner-offset) + 4.5rem)}
.ds-site img,.ds-site svg{max-width:100%;display:block}
.ds-site h1,.ds-site h2,.ds-site h3,.ds-site p{overflow-wrap:anywhere}
.ds-skip{position:absolute;left:var(--ds-space-sm);top:0;transform:translateY(-140%);background:var(--ds-card);color:var(--ds-ink);padding:.6rem .9rem;z-index:60;font-weight:650}
.ds-skip:focus{transform:none}
.ds-banner{background:var(--ds-banner);color:var(--ds-banner-text);text-align:center;font-weight:650;font-size:var(--ds-type-small);line-height:1.35;padding:.7rem var(--ds-gutter);border-bottom:3px solid var(--ds-accent)}
.ds-body .ds-banner{position:sticky;top:0;z-index:40}
.ds-header{background:color-mix(in srgb,var(--ds-paper) 92%,transparent);border-bottom:1px solid var(--ds-line)}
.ds-body .ds-header{position:sticky;top:var(--ds-banner-offset);z-index:30;backdrop-filter:blur(10px)}
.ds-wrap{width:min(var(--ds-wrap),calc(100% - (var(--ds-gutter) * 2)));margin-inline:auto}
.ds-header-inner,.ds-actions,.ds-menu-meta,.ds-review-meta{display:flex;flex-wrap:wrap;gap:var(--ds-space-xs) var(--ds-space-sm);align-items:center}
.ds-header-inner{justify-content:space-between;min-height:3.5rem}
.ds-wordmark{font-family:var(--ds-font-display);font-weight:var(--ds-display-weight);font-size:1.15rem;color:var(--ds-ink);text-decoration:none;letter-spacing:-.02em}
.ds-wordmark:hover{color:var(--ds-accent)}
.ds-header-nav{display:flex;gap:1.1rem}
.ds-header-nav a,.ds-nav-disclosure a{color:var(--ds-ink);text-decoration:none;font-weight:600}
.ds-header-nav a:hover,.ds-nav-disclosure a:hover{color:var(--ds-accent)}
.ds-nav-disclosure{display:none;position:relative}
.ds-nav-disclosure summary{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;list-style:none;border:1px solid var(--ds-line);border-radius:999px;padding:0 .9rem;font-weight:650;cursor:pointer;background:var(--ds-card)}
.ds-nav-disclosure summary::-webkit-details-marker{display:none}
.ds-nav-disclosure nav{position:absolute;right:0;top:calc(100% + .5rem);min-width:200px;background:var(--ds-card);border:1px solid var(--ds-line);border-radius:var(--ds-radius);padding:.35rem;box-shadow:0 12px 32px color-mix(in srgb,var(--ds-ink) 8%,transparent);z-index:35}
.ds-nav-disclosure a{display:block;min-height:44px;padding:.7rem .85rem;border-radius:calc(var(--ds-radius) - 4px)}
.ds-hero{padding:clamp(2.25rem,6vw,4.5rem) 0;border-bottom:1px solid var(--ds-line)}
.ds-hero-grid,.ds-about-grid,.ds-hours-grid,.ds-booking-grid{display:grid;gap:clamp(1.25rem,4vw,4rem);align-items:center}
.ds-hero-grid{grid-template-columns:minmax(0,1.25fr) minmax(220px,.75fr)}
.ds-about-grid{grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);align-items:start}
.ds-hours-grid,.ds-booking-grid{grid-template-columns:minmax(0,1.15fr) minmax(220px,.85fr)}
.ds-hours-grid{align-items:start}
.ds-eyebrow{margin:0 0 .65rem;text-transform:uppercase;letter-spacing:var(--ds-tracking-eyebrow);font-size:var(--ds-type-eyebrow);font-weight:700;color:var(--ds-accent)}
.ds-display{margin:0 0 .75rem;font-family:var(--ds-font-display);font-weight:var(--ds-display-weight);font-size:var(--ds-type-display);line-height:var(--ds-leading-display);letter-spacing:var(--ds-tracking-display);font-optical-sizing:auto}
.ds-title{margin:0 0 .45rem;font-family:var(--ds-font-display);font-weight:var(--ds-display-weight);font-size:var(--ds-type-title);line-height:1.05;letter-spacing:-.03em}
.ds-sub{margin:0;font-family:var(--ds-font-display);font-weight:560;font-size:var(--ds-type-heading);letter-spacing:-.02em;line-height:1.2}
.ds-lede{margin:0 0 .85rem;max-width:38rem;font-size:1.15rem}
.ds-note,.ds-source,.ds-muted,.ds-placeholder{color:var(--ds-muted)}
.ds-note,.ds-source{margin:0 0 1rem;max-width:40rem}
.ds-source{font-size:var(--ds-type-small)}
.ds-placeholder{font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.ds-plain{white-space:pre-line}
.ds-actions{margin-top:1.4rem}
.ds-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.8rem 1.2rem;border-radius:999px;border:1.5px solid transparent;font-weight:700;line-height:1.2;text-decoration:none}
.ds-btn-primary{background:var(--ds-accent);color:var(--ds-on-accent);border-color:var(--ds-accent)}
.ds-btn-primary:hover{background:var(--ds-accent-hover);border-color:var(--ds-accent-hover);color:var(--ds-on-accent)}
.ds-btn-secondary{background:transparent;color:var(--ds-ink);border-color:var(--ds-ink)}
.ds-btn-secondary:hover{background:var(--ds-ink);color:var(--ds-paper)}
.ds-btn-large{width:100%;padding:1rem 1.35rem;font-size:1.08rem}
.ds-hero-media{width:min(100%,360px);margin:0;justify-self:end}
.ds-hero-media img,.ds-gallery img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--ds-radius);background:var(--ds-ink)}
.ds-hero-media figcaption,.ds-gallery figcaption{margin-top:.65rem;color:var(--ds-muted);font-size:var(--ds-type-small)}
.ds-section{padding:var(--ds-section) 0}
.ds-section-head{margin-bottom:var(--ds-space-md)}
.ds-menu{list-style:none;margin:0;padding:0;background:var(--ds-card);border:1px solid var(--ds-line);border-radius:var(--ds-radius);box-shadow:0 12px 32px color-mix(in srgb,var(--ds-ink) 6%,transparent)}
.ds-menu-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:var(--ds-space-sm);align-items:baseline;padding:1rem 1.15rem;border-bottom:1px solid var(--ds-line)}
.ds-menu-row:last-child{border-bottom:0}
.ds-index{color:var(--ds-accent);font-size:.75rem;font-weight:700;letter-spacing:.12em;font-variant-numeric:tabular-nums}
.ds-menu-meta{justify-content:flex-end;font-variant-numeric:tabular-nums}
.ds-price{font-weight:700}
.ds-unconfirmed{font-weight:700}
.ds-empty{margin:0;padding:1.2rem 1.25rem;background:var(--ds-card);border:1px solid var(--ds-line);border-radius:var(--ds-radius)}
.ds-gallery{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.9rem}
.ds-gallery figure{margin:0;background:var(--ds-card);border:1px solid var(--ds-line);border-radius:var(--ds-radius);padding:.7rem}
.ds-card{background:var(--ds-card);border:1px solid var(--ds-line);border-radius:var(--ds-radius);padding:1.25rem 1.3rem;box-shadow:0 12px 32px color-mix(in srgb,var(--ds-ink) 6%,transparent)}
.ds-card p:last-child,.ds-card dd:last-child{margin-bottom:0}
.ds-hours-grid .ds-card h3,.ds-sub{margin-bottom:.55rem}
.ds-defn{margin:0}
.ds-defn div+div{margin-top:.9rem}
.ds-defn dt{font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ds-accent)}
.ds-defn dd{margin:.25rem 0 0}
.ds-booking{background:var(--ds-ink);color:var(--ds-on-ink)}
.ds-booking .ds-title,.ds-booking .ds-lede,.ds-booking .ds-plain{color:var(--ds-on-ink)}
.ds-booking .ds-eyebrow,.ds-booking a:not(.ds-btn){color:var(--ds-accent-on-ink)}
.ds-booking .ds-note,.ds-booking .ds-muted,.ds-booking .ds-placeholder,.ds-booking .ds-source{color:var(--ds-on-ink-muted)}
.ds-booking-card{background:color-mix(in srgb,var(--ds-on-ink) 8%,var(--ds-ink));border-radius:var(--ds-radius);padding:1.4rem}
.ds-policy{margin:.9rem 0 0;padding-left:1.15rem}
.ds-policy li+li{margin-top:.25rem}
.ds-review{margin:0 0 1rem;padding:1.1rem 1.2rem 1rem;background:var(--ds-card);border-left:3px solid var(--ds-accent);border-radius:var(--ds-radius)}
.ds-review blockquote{margin:0}
.ds-review p{margin:0}
.ds-review figcaption{margin-top:.75rem;color:var(--ds-muted);font-size:var(--ds-type-small)}
.ds-footer{background:var(--ds-paper-deep);border-top:1px solid var(--ds-line);padding:2.4rem 0 3rem}
.ds-footer-disclaimer{display:inline-block;margin:0 0 1rem;padding:.4rem .7rem;background:var(--ds-banner);color:var(--ds-banner-text);font-weight:650}
.ds-footer h2{font-size:1.15rem}
.ds-footer ul{margin:.4rem 0 0;padding-left:1.15rem}
.ds-footer li{margin:.35rem 0}
[data-theme="hair-studio"] .ds-hero-media{order:-1;justify-self:start}
[data-theme="skin-care"] .ds-section{padding-block:clamp(3.25rem,8vw,6rem)}
[data-theme="convenience"] .ds-display{letter-spacing:-.045em}
:focus-visible{outline:3px solid var(--ds-focus,#1c1612);outline-offset:3px}
.ds-booking :focus-visible,.ds-banner :focus-visible{outline-color:var(--ds-accent-on-ink)}
@media (max-width:720px){
 .ds-hero-grid,.ds-about-grid,.ds-hours-grid,.ds-booking-grid,.ds-gallery{grid-template-columns:minmax(0,1fr)}
 .ds-menu-row{grid-template-columns:auto minmax(0,1fr)}
 .ds-menu-meta{grid-column:2;justify-content:flex-start}
 .ds-header-nav{display:none}
 .ds-nav-disclosure{display:block}
 .ds-hero-media,[data-theme="hair-studio"] .ds-hero-media{order:0;justify-self:center}
}
@media (max-width:390px){
 :root{--ds-banner-offset:3.5rem}
 .ds-wrap{width:min(var(--ds-wrap),calc(100% - 1.25rem))}
 .ds-display{font-size:clamp(2.35rem,11vw,3.1rem)}
 .ds-hero{padding-block:1.75rem 1.5rem}
 .ds-menu-row{padding:.9rem .85rem}
 .ds-actions,.ds-actions .ds-btn{align-items:stretch}
 .ds-actions .ds-btn{width:100%}
 .ds-header-inner{min-height:3.25rem}
}
@media (prefers-reduced-motion:no-preference){
 [data-motion="editorial"] .ds-hero-copy{animation:ds-rise .95s cubic-bezier(.16,1,.3,1) both}
 [data-motion="editorial"] .ds-hero-media{animation:ds-reveal 1.15s cubic-bezier(.16,1,.3,1) .08s both}
 [data-motion="calm"] .ds-hero-copy{animation:ds-rise 1.2s ease both}
 [data-motion="calm"] .ds-hero-media{animation:ds-reveal 1.35s ease .06s both}
 [data-motion="precise"] .ds-hero-copy{animation:ds-rise .55s cubic-bezier(.2,.7,.2,1) both}
 [data-motion="precise"] .ds-hero-media{animation:ds-reveal .6s cubic-bezier(.2,.7,.2,1) .04s both}
}
@keyframes ds-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes ds-reveal{from{opacity:0;clip-path:inset(0 0 10% 0)}to{opacity:1;clip-path:inset(0)}}
@media (prefers-reduced-motion:reduce){
 html{scroll-behavior:auto}
 .ds-hero-copy,.ds-hero-media,.ds-site *{animation:none !important;transition:none !important;scroll-behavior:auto !important}
 .ds-hero-copy,.ds-hero-media{opacity:1 !important;transform:none !important;clip-path:none !important}
}
@media (forced-colors:active){
 .ds-btn,.ds-card,.ds-menu,.ds-banner{border:1px solid ButtonText}
}
`;
}
