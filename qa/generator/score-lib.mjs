// Offline quality rubric for a rendered site directory.
// Scores structure, type, imagery alt text, contrast samples, overflow
// measurements, and a byte budget. It does not grade taste, and it does not
// treat a blueprint JSON score as a visual score.
import {load} from 'cheerio';
import {readdir, readFile, stat} from 'node:fs/promises';
import {join, extname} from 'node:path';

export const WEIGHTS = {
  'heading-hierarchy': 12,
  'section-variety': 14,
  'image-alt': 10,
  'font-loading': 14,
  'boilerplate-copy': 10,
  'mobile-overflow': 14,
  'contrast': 14,
  'perf-budget': 12,
};

/** Phrases the production generator still emits for businesses that are not
 *  a clinic, a landscape company, or a generic consultancy. */
export const BOILERPLATE_PATTERNS = [
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
];

const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
  'monospace', 'cursive', 'fantasy', 'emoji', 'math', 'fangsong', 'inherit',
  'initial', 'unset', 'revert', '-apple-system', 'blinkmacsystemfont', 'segoe ui',
  'segoe ui emoji', 'segoe ui symbol', 'helvetica', 'helvetica neue', 'arial', 'roboto',
  'noto sans', 'noto sans mono', 'noto color emoji', 'apple color emoji', 'georgia',
  'times', 'times new roman', 'palatino', 'palatino linotype', 'cambria',
  'iowan old style', 'menlo', 'monaco', 'consolas', 'courier', 'courier new',
  'liberation mono', 'liberation sans', 'sfmono-regular',
]);

const UTILITY_PREFIX = /^(?:sm|md|lg|xl|2xl|hover|focus|group|motion):|^(?:bg|text|mt|mb|ml|mr|mx|my|px|py|pt|pb|pl|pr|p|m|gap|grid|flex|hidden|block|inline|rounded|border|font|leading|tracking|max-w|min-w|max-h|min-h|w-|h-|items|justify|overflow|relative|absolute|fixed|sticky|inset|top|left|right|bottom|z-|col-|row-|self-|basis|grow|shrink|truncate|break-|whitespace|not-italic|underline|uppercase|lowercase|antialiased|shadow|aspect|object|transition|duration|ease|opacity|isolate|place-|space-|list-|cursor|select-|pointer-|sr-only|size-|wrap|nowrap)/;

export function contrastRatio(foreground, background) {
  const L1 = relativeLuminance(foreground);
  const L2 = relativeLuminance(background);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const R = channel(r);
  const G = channel(g);
  const B = channel(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function parseColor(input) {
  if (!input || typeof input !== 'string') return null;
  const value = input.trim().toLowerCase();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (!rgb) return null;
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

function check(id, score, max, pass, detail, extra = {}) {
  return {id, score, max, pass, detail, ...extra};
}

export function scoreHeadingHierarchy(html) {
  const $ = load(html);
  const headings = $('h1,h2,h3,h4,h5,h6').toArray().map((el) => ({
    level: Number(el.tagName.slice(1)),
    text: $(el).text().replace(/\s+/g, ' ').trim(),
  }));
  const h1 = headings.filter((h) => h.level === 1);
  const skips = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      skips.push(`h${headings[i - 1].level} → h${headings[i].level} (“${headings[i].text.slice(0, 60)}”)`);
    }
  }
  const empty = headings.filter((h) => !h.text).length;
  const max = WEIGHTS['heading-hierarchy'];
  let score = max;
  const notes = [];
  if (h1.length !== 1) {
    score = 0;
    notes.push(`${h1.length} h1 elements`);
  }
  if (skips.length) {
    score = Math.min(score, 6);
    notes.push(`skipped levels: ${skips.slice(0, 3).join('; ')}`);
  }
  if (empty) {
    score = Math.min(score, 4);
    notes.push(`${empty} empty heading(s)`);
  }
  if (!notes.length) notes.push(`1 h1, ${headings.length} headings, no skipped levels`);
  return check('heading-hierarchy', score, max, score === max, notes.join('. '), {headings: headings.length, h1: h1.length});
}

function semanticTokens(className) {
  return String(className || '').split(/\s+/).filter((token) => {
    if (!token || token.startsWith('motion-')) return false;
    if (token.includes('[') || token.includes(']') || token.includes('/')) return false;
    if (UTILITY_PREFIX.test(token)) return false;
    return true;
  });
}

export function scoreSectionVariety(html) {
  const $ = load(html);
  const signatures = new Set();
  $('section').each((_, el) => {
    const node = $(el);
    const data = Object.entries(node.attr() || {})
      .filter(([key]) => key.startsWith('data-') && /layout|composition|scene|kind/.test(key))
      .map(([key, value]) => `${key}=${value}`)
      .sort();
    const classes = semanticTokens(node.attr('class')).sort();
    const id = node.attr('id');
    signatures.add([...data, ...classes, id ? `#${id}` : ''].filter(Boolean).join('|') || '(plain section)');
  });
  const rich = ['table', 'blockquote', 'canvas', 'video', 'dialog', 'dl', 'address', 'picture']
    .filter((tag) => $(tag).length > 0);
  const distinct = signatures.size;
  const max = WEIGHTS['section-variety'];
  const fromSections = Math.min(8, distinct * 2);
  const fromRich = Math.min(6, rich.length * 2);
  const score = Math.min(max, fromSections + fromRich);
  return check(
    'section-variety',
    score,
    max,
    score >= 12,
    `${distinct} distinct section signature(s); rich patterns: ${rich.join(', ') || 'none'}`,
    {signatures: [...signatures], rich},
  );
}

export function scoreImageAlt(html) {
  const $ = load(html);
  const images = $('img').toArray();
  let missing = 0;
  let meaningful = 0;
  let decorative = 0;
  for (const el of images) {
    const node = $(el);
    const alt = node.attr('alt');
    const hidden = node.attr('aria-hidden') === 'true' || node.parents('[aria-hidden="true"]').length > 0;
    if (alt === undefined) {
      missing += 1;
      continue;
    }
    if (!alt.trim() || hidden) decorative += 1;
    else if (alt.trim().length >= 5) meaningful += 1;
    else missing += 1;
  }
  const max = WEIGHTS['image-alt'];
  let score = 0;
  let detail = '';
  if (missing > 0) {
    score = 0;
    detail = `${missing} image(s) missing a usable alt`;
  } else if (images.length === 0) {
    score = 4;
    detail = 'No img elements. Alt text is vacuously present, and the page has no photographic content.';
  } else {
    score = max;
    detail = `${meaningful} described image(s), ${decorative} decorative`;
  }
  return check('image-alt', score, max, score === max, detail, {images: images.length, missing, meaningful});
}

function primaryFamily(list) {
  const first = String(list || '').split(',')[0].replace(/['"]/g, '').replace(/!important/g, '').trim().toLowerCase();
  const cleaned = first.replace(/^(?:italic|oblique|normal|bold|small-caps|[\d.]+(?:px|rem|em|%)?(?:\/[\d.]+)?\s+)+/i, '').trim();
  if (!cleaned || cleaned.startsWith('var(') || GENERIC_FAMILIES.has(cleaned)) return null;
  return cleaned;
}

function fontFamilies(css) {
  const found = new Set();
  const loaded = new Set();
  const blocks = css.split('@font-face');
  for (let i = 1; i < blocks.length; i++) {
    const header = blocks[i].slice(0, blocks[i].indexOf('}'));
    const family = header.match(/font-family:\s*([^;]+)/i);
    const name = family ? primaryFamily(family[1]) : null;
    if (name) loaded.add(name);
  }
  for (const match of css.matchAll(/(?:^|[;{\s])font-family:\s*([^;}{]+)/gi)) {
    const name = primaryFamily(match[1]);
    if (name) found.add(name);
  }
  for (const match of css.matchAll(/(?:^|[;{\s])font:\s*([^;}{]+)/gi)) {
    const name = primaryFamily(match[1]);
    if (name) found.add(name);
  }
  return {found, loaded};
}

function embeddedCss(html) {
  return [...String(html).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join('\n');
}

export function scoreFontLoading(html, css) {
  const cssText = `${css}\n${embeddedCss(html)}`;
  const combined = `${cssText}\n${html}`;
  const faces = (cssText.match(/@font-face/g) || []).length;
  const woff2 = /woff2/i.test(combined);
  const {found, loaded} = fontFamilies(cssText);
  const max = WEIGHTS['font-loading'];
  let score = 0;
  let detail = '';
  if (faces > 0 && woff2 && loaded.size >= 2) {
    score = max;
    detail = `Self-hosted faces: ${[...loaded].join(', ')}`;
  } else if (faces > 0 && woff2 && loaded.size === 1) {
    score = 9;
    detail = `Only one self-hosted family (${[...loaded][0]})`;
  } else if (found.size >= 1 && loaded.size === 0) {
    score = 3;
    detail = `Named families are not loaded: ${[...found].slice(0, 4).join(', ')}`;
  } else if (faces > 0) {
    score = 6;
    detail = '@font-face present without a woff2 source';
  } else {
    score = 0;
    detail = 'No @font-face and no self-hosted font. The page inherits the system UI font.';
  }
  return check('font-loading', score, max, score === max, detail, {faces, families: [...loaded]});
}

export function scoreBoilerplate(html) {
  const text = load(html).root().text().replace(/\s+/g, ' ');
  const hits = BOILERPLATE_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  const max = WEIGHTS['boilerplate-copy'];
  const score = Math.max(0, max - hits.length * 3);
  return check(
    'boilerplate-copy',
    score,
    max,
    hits.length === 0,
    hits.length ? `Template phrases still visible (${hits.length}): ${hits.slice(0, 4).join(' | ')}` : 'No listed generator boilerplate phrases',
    {hits},
  );
}

export function scoreOverflow(measurement) {
  const max = WEIGHTS['mobile-overflow'];
  if (!measurement) {
    return check('mobile-overflow', 0, max, false, 'Not measured', {measured: false});
  }
  const pass = measurement.scrollWidth <= measurement.clientWidth + 1;
  return check(
    'mobile-overflow',
    pass ? max : 0,
    max,
    pass,
    pass
      ? `No horizontal overflow at ${measurement.width}px (scroll ${measurement.scrollWidth} / client ${measurement.clientWidth})`
      : `Overflow at ${measurement.width}px: scroll ${measurement.scrollWidth} vs client ${measurement.clientWidth}. ${(measurement.offenders || []).slice(0, 3).join(' | ')}`,
    {measured: true, ...measurement},
  );
}

export function scoreContrast(samples) {
  const max = WEIGHTS['contrast'];
  if (!samples || !samples.length) {
    return check('contrast', 0, max, false, 'Not measured', {measured: false});
  }
  const failing = samples.filter((sample) => !sample.pass);
  const score = Math.round(max * (samples.length - failing.length) / samples.length);
  const worst = [...failing].sort((a, b) => a.ratio - b.ratio)[0];
  return check(
    'contrast',
    score,
    max,
    failing.length === 0,
    failing.length
      ? `${failing.length}/${samples.length} text samples below WCAG AA. Worst ${worst.ratio.toFixed(2)}:1 on “${String(worst.text).slice(0, 40)}”`
      : `${samples.length} text samples meet WCAG AA (4.5:1 body, 3:1 large)`,
    {measured: true, samples: samples.length, failing: failing.length},
  );
}

export function scorePerf(bytes) {
  const max = WEIGHTS['perf-budget'];
  const js = bytes.jsBytes || 0;
  const css = bytes.cssBytes || 0;
  const fonts = bytes.fontBytes || 0;
  const images = bytes.imageBytes || 0;
  const html = bytes.htmlBytes || 0;
  const total = html + css + js + fonts + images;
  let score = max;
  const notes = [];
  if (!bytes.viewport) {
    score -= 3;
    notes.push('missing viewport meta');
  }
  if (bytes.remoteFontStylesheets) {
    score -= 3;
    notes.push(`${bytes.remoteFontStylesheets} remote font stylesheet(s)`);
  }
  if (js > 200_000) {
    score -= 5;
    notes.push(`JS ${js} bytes exceeds 200000`);
  } else if (js > 80_000) {
    score -= 3;
    notes.push(`JS ${js} bytes exceeds 80000`);
  }
  if (css > 150_000) {
    score -= 2;
    notes.push(`CSS ${css} bytes`);
  }
  if (fonts > 250_000) {
    score -= 2;
    notes.push(`fonts ${fonts} bytes`);
  }
  if (images > 1_500_000) {
    score -= 2;
    notes.push(`images ${images} bytes`);
  }
  if (total > 2_000_000) {
    score -= 2;
    notes.push(`total ${total} bytes`);
  }
  score = Math.max(0, score);
  if (!notes.length) notes.push(`total ${total} bytes (html ${html}, css ${css}, js ${js}, fonts ${fonts}, images ${images})`);
  return check('perf-budget', score, max, score === max, notes.join('; '), {total, ...bytes});
}

export function combineScores(checks) {
  const max = checks.reduce((sum, item) => sum + item.max, 0);
  const score = checks.reduce((sum, item) => sum + item.score, 0);
  return {
    score,
    max,
    pass: checks.every((item) => item.pass),
    checks,
  };
}

const TEXT_EXT = new Set(['.html', '.css', '.js', '.mjs', '.svg', '.json', '.txt', '.md']);
const FONT_EXT = new Set(['.woff', '.woff2', '.ttf', '.otf']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico']);

async function walkFiles(dir, acc = []) {
  const entries = await readdir(dir, {withFileTypes: true});
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next' || entry.name === 'screenshots') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(path, acc);
    else if (entry.isFile()) acc.push(path);
  }
  return acc;
}

export async function readSiteDirectory(dir) {
  const files = await walkFiles(dir);
  let indexHtml = '';
  const cssParts = [];
  const bytes = {htmlBytes: 0, cssBytes: 0, jsBytes: 0, fontBytes: 0, imageBytes: 0, otherBytes: 0};
  for (const file of files) {
    const info = await stat(file);
    const ext = extname(file).toLowerCase();
    if (ext === '.html') {
      bytes.htmlBytes += info.size;
      if (file.endsWith('/index.html') || file.endsWith('\\index.html')) {
        indexHtml = await readFile(file, 'utf8');
      }
    } else if (ext === '.css') {
      bytes.cssBytes += info.size;
      cssParts.push(await readFile(file, 'utf8'));
    } else if (ext === '.js' || ext === '.mjs') bytes.jsBytes += info.size;
    else if (FONT_EXT.has(ext)) bytes.fontBytes += info.size;
    else if (IMAGE_EXT.has(ext)) bytes.imageBytes += info.size;
    else if (!TEXT_EXT.has(ext)) bytes.otherBytes += info.size;
  }
  const html = indexHtml;
  const css = cssParts.join('\n');
  const viewport = /name=["']viewport["']/i.test(html);
  const remoteFontStylesheets = (html.match(/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net/gi) || []).length;
  return {html, css, bytes: {...bytes, viewport, remoteFontStylesheets, source: 'directory'}};
}

export async function scoreSiteDirectory(dir, measurements = {}) {
  const site = await readSiteDirectory(dir);
  let perfBytes = site.bytes;
  try {
    const manifest = JSON.parse(await readFile(join(dir, 'network-manifest.json'), 'utf8'));
    const keys = ['htmlBytes', 'cssBytes', 'jsBytes', 'fontBytes', 'imageBytes'];
    perfBytes = {...site.bytes, source: 'directory+network'};
    for (const key of keys) perfBytes[key] = Math.max(site.bytes[key] || 0, manifest[key] || 0);
    if (manifest.remoteFontStylesheets) perfBytes.remoteFontStylesheets = manifest.remoteFontStylesheets;
    if (typeof manifest.viewport === 'boolean') perfBytes.viewport = manifest.viewport || site.bytes.viewport;
  } catch {
    // Directory byte counts are the budget when no browser transfer log was saved.
  }
  const checks = [
    scoreHeadingHierarchy(site.html),
    scoreSectionVariety(site.html),
    scoreImageAlt(site.html),
    scoreFontLoading(site.html, site.css),
    scoreBoilerplate(site.html),
    scoreOverflow(measurements.overflow ?? null),
    scoreContrast(measurements.contrast ?? null),
    scorePerf(perfBytes),
  ];
  return {directory: dir, ...combineScores(checks), measuredAt: new Date().toISOString()};
}

export const BROWSER_PROBE = `(() => {
  const parse = (value) => {
    const match = String(value || '').match(/rgba?\\(([^)]+)\\)/);
    if (!match) return null;
    const parts = match[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
    const alpha = parts.length >= 4 ? parts[3] : 1;
    return {rgb: parts.slice(0, 3), alpha};
  };
  const opaqueBackground = (el) => {
    let node = el;
    while (node) {
      const parsed = parse(getComputedStyle(node).backgroundColor);
      if (parsed && parsed.alpha >= 0.98) return parsed.rgb;
      node = node.parentElement;
    }
    return null;
  };
  const contrastOf = (fg, bg) => {
    const lin = (c) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const L = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    const a = L(fg);
    const b = L(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const nodes = [...document.querySelectorAll('h1,h2,h3,h4,p,a,li,span,button,td,th,figcaption,label,dt,dd')];
  const samples = [];
  for (const el of nodes) {
    if (samples.length >= 50) break;
    const text = (el.innerText || '').replace(/\\s+/g, ' ').trim();
    if (text.length < 2) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const fg = parse(style.color);
    const bg = opaqueBackground(el);
    if (!fg || fg.alpha < 0.98 || !bg) continue;
    const size = parseFloat(style.fontSize) || 16;
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const ratio = contrastOf(fg.rgb, bg);
    samples.push({
      text: text.slice(0, 80),
      tag: el.tagName.toLowerCase(),
      ratio: Math.round(ratio * 100) / 100,
      large,
      pass: ratio >= (large ? 3 : 4.5),
    });
  }
  const width = document.documentElement.clientWidth;
  const offenders = [];
  for (const el of document.body.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (rect.right > width + 1 || rect.left < -1) {
      const label = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\\s+/).slice(0, 2).join('.') : '');
      offenders.push(label.slice(0, 120));
      if (offenders.length >= 8) break;
    }
  }
  return {
    overflow: {
      width,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: width,
      offenders,
    },
    contrast: samples,
  };
})()`;
