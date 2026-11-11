// Turns a blueprint into the design system's standalone document.
// renderSite owns the disclaimer, noindex meta, tokens, and sections.
// This file only maps facts and appends layout rules the document otherwise ignores.
import type {GeneratedConceptSet} from '../lib/concept-imagery.ts';
import {readBusinessLine, type BusinessLine} from '../lib/site-presentation.ts';
import type {SiteBlueprint} from '../lib/site-blueprint.ts';
import {selectSiteMedia} from '../lib/site-media-selection.ts';
import {renderSite} from '../lib/design-system/render.ts';
import {escapeHtml} from '../lib/design-system/policy.ts';
import type {BusinessCategory} from '../lib/design-system/tokens.ts';
import type {DesignSite, MenuItem, Review} from '../lib/design-system/types.ts';

export type RecordedOffering = {name: string; detail?: string | null; duration?: string | null; price?: string | null};
export type RecordedFacts = {
  address?: string | null;
  hours?: string | null;
  mapUrl?: string | null;
  heroNote?: string | null;
  servicesNote?: string | null;
  bookingNote?: string | null;
  policies?: string[] | null;
  offerings?: RecordedOffering[] | null;
  reviews?: Review[] | null;
  sources?: Array<{label: string; href: string}> | null;
};

const COMPOSITIONS = ['split-editorial', 'immersive', 'bento', 'service-index', 'centered', 'asymmetric'] as const;
const BOILERPLATE = [
  /expertise organized around what comes next/i,
  /a more useful introduction to the business/i,
  /a better way to meet your next customer/i,
  /make every first impression count/i,
  /explore a modern online introduction to this business/i,
  /talk directly with the team/i,
  /a direct path from interest to action/i,
  /review the business[’']s confirmed services/i,
  /starting a conversation/i,
  /what we offer/i,
  /what this business offers/i,
  /local business/i,
  /request information/i,
  /services and expertise/i,
  /getting started/i,
  /move forward/i,
  /contact the business directly for current information/i,
  /^serving\b/i,
];

const LINE_THEME: Record<BusinessLine, BusinessCategory> = {
  barber: 'barber',
  salon: 'hair-studio',
  produce: 'produce-market',
  deli: 'deli',
  convenience: 'convenience',
};

type PackView = NonNullable<SiteBlueprint['skillPacks']>;

export function renderWiredSite(site: SiteBlueprint, options?: {
  conceptMedia?: GeneratedConceptSet | null;
  recorded?: RecordedFacts | null;
  /** Relative or site-root font directory. Remote URLs are rejected. */
  fontHref?: string;
}): string {
  const recorded = options?.recorded ?? null;
  const line = readBusinessLine(site.businessName, site.category);
  const category = themeCategory(site, line);
  const matched = Boolean(line) || categoryMatchedByName(site, category);
  const media = selectSiteMedia(site, options?.conceptMedia ?? undefined);
  const address = clean(recorded?.address, 500);
  const appointment = text(site.content.appointmentUrl, 1600);
  const bookLabel = appointment ? bookingLabel(site.primaryAction, appointment) : null;
  const phone = text(site.contact.phone, 80);
  const action = appointment && bookLabel ? {label: bookLabel, href: appointment} : null;
  const offerings = menuItems(site, recorded);
  const reviews = (recorded?.reviews ?? []).filter(review => text(review.quote, 2000) && text(review.author, 160) && text(review.source, 180));
  const designSite: DesignSite = {
    category,
    businessName: text(site.businessName, 200) || 'to confirm',
    hero: {
      headline: text(site.businessName, 200),
      support: address,
      note: clean(recorded?.heroNote, 400),
      primaryAction: action,
      media: media.displayHero ? {
        src: media.displayHero.src,
        alt: media.displayHero.alt,
        caption: media.displayHero.credit ?? null,
      } : null,
    },
    services: offerings,
    servicesHeading: matched ? null : 'Services',
    servicesNote: clean(recorded?.servicesNote, 400),
    gallery: media.gallery.map(image => ({src: image.src, alt: image.alt, credit: image.credit ?? null})),
    about: {
      heading: matched ? null : 'About',
      body: clean(site.content.about, 2000),
    },
    hoursLocation: {
      address,
      hours: clean(recorded?.hours, 500),
      phone,
      email: text(site.contact.email, 140),
      mapUrl: text(recorded?.mapUrl, 1600),
    },
    reviews,
    booking: {
      body: clean(recorded?.bookingNote, 800),
      policies: (recorded?.policies ?? []).map(item => clean(item, 200)).filter((item): item is string => Boolean(item)),
      action,
      phone,
    },
    footer: {
      sources: (recorded?.sources ?? []).flatMap(source => {
        const label = clean(source.label, 180);
        const href = text(source.href, 1600);
        return label && href ? [{label, href}] : [];
      }),
    },
  };
  let html = renderSite(designSite, {fontBase: './fonts'});
  html = retargetFonts(html, options?.fontHref ?? 'fonts/');
  html = html.replace(
    '<div class="ds-site ds-body"',
    `<div class="ds-site ds-body" data-composition="${compositionOf(site)}" data-typography="${site.design.typography}" data-image="${site.design.imageTreatment}" data-motion-entry="${site.design.motionPlan.pageEntry}" data-motion-reveal="${site.design.motionPlan.sectionReveal}" data-motion-media="${site.design.motionPlan.mediaMotion}" data-motion-navigation="${site.design.motionPlan.navigationMotion}"${packAttribute(site.skillPacks)}`
  );
  html = withMonogram(html, designSite.businessName);
  html = markAddress(html);
  const extra = `${WIRING_CSS}\n${compositionCss(compositionOf(site))}\n${packCss(site.skillPacks)}`;
  html = html.replace('</style>', `${extra}</style>`);
  const pack = usablePack(site.skillPacks);
  if (pack) html = html.replace('<footer class="ds-footer"', `${packRegions(pack)}<footer class="ds-footer"`);
  return html;
}

function themeCategory(site: SiteBlueprint, line: BusinessLine | null): BusinessCategory {
  if (line === 'salon' && /skin|facial|nail|spa/i.test(`${site.businessName} ${site.category ?? ''}`)) return 'skin-care';
  if (line) return LINE_THEME[line];
  if (site.template === 'landscaping') return 'produce-market';
  if (site.template === 'medical') return 'skin-care';
  return 'barber';
}

function categoryMatchedByName(site: SiteBlueprint, category: BusinessCategory): boolean {
  const blob = `${site.businessName} ${site.category ?? ''}`;
  if (category === 'barber') return /\bbarbers?\b/i.test(blob);
  if (category === 'hair-studio') return /\bsalon\b|\bhair\b/i.test(blob);
  if (category === 'skin-care') return /\bskin\b|\bspa\b|\bnail\b/i.test(blob);
  if (category === 'deli') return /\bdeli\b/i.test(blob);
  if (category === 'produce-market') return /\bproduce\b|\bgrocery\b/i.test(blob);
  if (category === 'convenience') return /\bconvenience\b/i.test(blob);
  return false;
}

function menuItems(site: SiteBlueprint, recorded: RecordedFacts | null): MenuItem[] {
  const supplied = recorded?.offerings ?? [];
  if (supplied.length) {
    return supplied.flatMap(item => {
      const name = text(item?.name, 180);
      return name ? [{name, detail: item.detail ?? null, duration: item.duration ?? null, price: item.price ?? null}] : [];
    });
  }
  return site.services.map(name => ({name, price: null}));
}

function bookingLabel(primaryAction: string, href: string): string | null {
  const label = clean(primaryAction, 80);
  if (!label) return 'Book';
  try {
    const host = new URL(href).hostname;
    if (host.endsWith('booksy.com') && !/booksy/i.test(label)) return label;
  } catch {
    // Keep the caller's label when the href is not an absolute URL.
  }
  return label;
}

function compositionOf(site: SiteBlueprint): (typeof COMPOSITIONS)[number] {
  return COMPOSITIONS.includes(site.design.composition) ? site.design.composition : 'split-editorial';
}

function retargetFonts(html: string, fontHref: string): string {
  const href = fontHref.endsWith('/') ? fontHref : `${fontHref}/`;
  if (/^https?:|\/\/|\\/i.test(href)) throw new Error('font href must stay on this site');
  return html.replaceAll('url("./fonts/', `url("${href}`);
}

function withMonogram(html: string, name: string): string {
  const start = html.indexOf('<section class="ds-hero"');
  const end = start < 0 ? -1 : html.indexOf('</section>', start);
  if (start < 0 || end < 0) return html;
  const section = html.slice(start, end);
  if (section.includes('ds-hero-media')) return html;
  const close = section.lastIndexOf('</div>');
  if (close < 0) return html;
  const letters = escapeHtml(initials(name));
  const mark = `<figure class="ds-hero-media" data-mark="monogram"><svg viewBox="0 0 200 200" aria-hidden="true"><rect x="10" y="10" width="180" height="180" fill="none" stroke="currentColor" stroke-width="1.25"/><text x="100" y="116" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="64">${letters}</text></svg><figcaption>Initials from the business name. Not a photograph.</figcaption></figure>`;
  return html.slice(0, start) + section.slice(0, close) + mark + section.slice(close) + html.slice(end);
}

function markAddress(html: string): string {
  return html.replace(
    /(<dt>Address<\/dt><dd>)<span class="ds-plain">([\s\S]*?)<\/span>(<\/dd>)/,
    '$1<address class="ds-plain">$2</address>$3'
  );
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(word => /[A-Za-z0-9]/.test(word) && !/^(and|the|of|&)$/i.test(word));
  const letters = words.slice(0, 2).map(word => (word.match(/[A-Za-z0-9]/) || [''])[0]).join('');
  return (letters || '•').toUpperCase();
}

function usablePack(pack: PackView | undefined): PackView | null {
  if (!pack?.ids?.length) return null;
  if (JSON.stringify(pack).includes('owner_approved')) return null;
  if (pack.disclaimer !== 'Internal concept, not endorsed by the business') return null;
  if ((pack.checkResults ?? []).some(check => check.severity === 'block' && check.pass === false)) return null;
  return pack;
}

function packAttribute(pack: PackView | undefined): string {
  const usable = usablePack(pack);
  return usable ? ` data-skill-pack="${escapeHtml(usable.ids.join(' '))}"` : '';
}

function packCss(pack: PackView | undefined): string {
  const usable = usablePack(pack);
  if (!usable) return '';
  const declarations: string[] = [];
  const color = usable.tokens?.color ?? {};
  const accent = safeColor(color.accent);
  const ink = safeColor(color.text);
  const paper = safeColor(color.scene || color.paper);
  const muted = safeColor(color.muted);
  if (accent) declarations.push(`--ds-accent:${accent}`);
  if (ink) declarations.push(`--ds-ink:${ink}`);
  if (paper) declarations.push(`--ds-paper:${paper}`);
  if (muted) declarations.push(`--ds-muted:${muted}`);
  const radius = /^\d+(\.\d+)?(px|rem)$/.test(usable.tokens?.radius?.panel || '') ? usable.tokens.radius.panel : '';
  if (radius) declarations.push(`--ds-radius:${radius}`);
  if (!declarations.length) return '';
  return `[data-skill-pack="${escapeHtml(usable.ids.join(' '))}"]{${declarations.join(';')}}`;
}

function packRegions(pack: PackView): string {
  const regions = pack.layouts?.flatMap(layout => layout.regions ?? []) ?? [];
  if (!regions.length) return '';
  const items = regions.map(region => `<li class="ds-pack-chip" data-layout="${escapeHtml(region.placement)}"><span>${escapeHtml(region.id)}</span> <span class="ds-placeholder">to confirm</span></li>`).join('');
  return `<section class="ds-section" id="site-pack" data-section="skill-pack" data-scene="skill-pack" data-layout="regions"><div class="ds-wrap"><h2 class="ds-title">Pack regions</h2><p class="ds-source">Slot values stay to confirm. The pack adds no prices, hours, reviews, or approval.</p><ul class="ds-pack-regions">${items}</ul></div></section>`;
}

function text(value: string | null | undefined, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function clean(value: string | null | undefined, max: number): string | null {
  const trimmed = text(value, max);
  if (!trimmed || BOILERPLATE.some(pattern => pattern.test(trimmed))) return null;
  return trimmed;
}

function safeColor(value: string | undefined): string | null {
  if (!value) return null;
  const color = value.trim();
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color)) return color;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(?:0|1|0?\.\d+)\s*)?\)$/.test(color)) return color;
  return null;
}

function compositionCss(composition: string): string {
  if (composition === 'centered') return '[data-composition="centered"] .ds-hero-grid{text-align:center}[data-composition="centered"] .ds-hero-copy{margin-inline:auto}';
  if (composition === 'immersive') return '[data-composition="immersive"] .ds-hero{min-height:min(80svh,860px);background:var(--ds-ink);color:var(--ds-on-ink)}[data-composition="immersive"] .ds-hero .ds-display,[data-composition="immersive"] .ds-hero .ds-plain{color:var(--ds-on-ink)}[data-composition="immersive"] .ds-hero .ds-muted,[data-composition="immersive"] .ds-hero figcaption{color:var(--ds-on-ink-muted)}[data-composition="immersive"] .ds-hero-media svg{color:var(--ds-on-ink);background:transparent}';
  if (composition === 'bento') return '[data-composition="bento"] .ds-menu{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;background:transparent;border:0;box-shadow:none}[data-composition="bento"] .ds-menu-row{background:var(--ds-card);border:1px solid var(--ds-line);border-radius:var(--ds-radius)}';
  if (composition === 'service-index') return '[data-composition="service-index"] .ds-hero{padding-block:1.4rem 1rem}[data-composition="service-index"] .ds-menu{box-shadow:none}';
  if (composition === 'asymmetric') return '[data-composition="asymmetric"] .ds-hero-media{order:-1;justify-self:start}';
  return '';
}

const WIRING_CSS = `
body{margin:0}
html{scroll-padding-top:calc(var(--ds-banner-offset, 2.75rem) + 4.5rem)}
.ds-hero-grid:not(:has(.ds-hero-media)){grid-template-columns:minmax(0,1fr)}
.ds-hero-media svg{width:min(100%,280px);height:auto;margin-inline:auto;color:var(--ds-ink);background:var(--ds-paper-deep);border-radius:var(--ds-radius)}
.ds-site a:not(.ds-btn){color:var(--ds-accent)}
.ds-footer a:not(.ds-btn){color:var(--ds-ink)}
.ds-booking a:not(.ds-btn){color:var(--ds-accent-on-ink)}
.ds-pack-regions{list-style:none;display:flex;flex-wrap:wrap;gap:.6rem;margin:0;padding:0}
.ds-pack-chip{border:1px solid var(--ds-line);border-radius:var(--ds-radius);background:var(--ds-card);padding:.7rem .9rem}
@media (max-width:720px){
 [data-composition="bento"] .ds-menu,[data-composition="asymmetric"] .ds-hero-grid{grid-template-columns:minmax(0,1fr)}
 [data-composition="immersive"] .ds-hero{min-height:0}
 [data-composition="asymmetric"] .ds-hero-media{order:0;justify-self:center}
}
`;
