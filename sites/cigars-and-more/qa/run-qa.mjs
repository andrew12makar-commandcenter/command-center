#!/usr/bin/env node
// Functional + visual QA for the Cigars & More demo.
// Usage: node qa/run-qa.mjs [--root site] [--out qa/screenshots] [--port 4317]
// Serves the static site, then checks 390 / 768 / 1440 px widths with Playwright.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright'); // uses the globally installed Playwright

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const root = resolve(arg('root', join(here, '..', 'site')));
const out = resolve(arg('out', join(here, 'screenshots')));
const port = Number(arg('port', 4317));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = join(root, p);
    if (!f.startsWith(root)) throw new Error('outside');
    const st = await stat(f);
    const body = await readFile(f);
    const range = req.headers.range;
    if (range && extname(f) === '.mp4') {
      const [a, b] = range.replace('bytes=', '').split('-');
      const start = Number(a), end = b ? Number(b) : st.size - 1;
      res.writeHead(206, { 'Content-Type': 'video/mp4', 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      return res.end(body.subarray(start, end + 1));
    }
    res.writeHead(200, { 'Content-Type': types[extname(f)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(port, r));
await mkdir(out, { recursive: true });
const base = `http://localhost:${port}/`;

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); };

const browser = await chromium.launch();
for (const [label, width, height] of [['390-mobile', 390, 844], ['768-tablet', 768, 1024], ['1440-desktop', 1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 1000 });
  const page = await ctx.newPage();
  const errors = [];
  const failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  page.on('requestfailed', (r) => { if (r.url().startsWith(base)) failed.push(r.url()); });
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  await page.goto(base, { waitUntil: 'networkidle' });
  const T = (n) => `[${label}] ${n}`;

  check(T('hero shows storefront name'), /Cigars\s*&\s*More/.test(await page.locator('h1').innerText()));
  check(T('demo notice visible'), await page.locator('.demo-bar').isVisible());
  check(T('noindex meta'), (await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(T('no horizontal page scroll'), overflow <= 0, `overflow ${overflow}px`);
  await page.screenshot({ path: join(out, `${label}-hero.png`) });

  // Scroll through the page so lazy media load, then screenshot full page.
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 160)); } window.scrollTo(0, 0); });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src));
  check(T('no broken images'), broken.length === 0, broken.join(', '));
  await page.screenshot({ path: join(out, `${label}-full.png`), fullPage: true });

  // Hero actions
  await page.getByRole('link', { name: 'Explore the Interior' }).click();
  await page.waitForTimeout(900);
  check(T('"Explore the Interior" reaches the Humidor'), await page.evaluate(() => { const r = document.getElementById('humidor').getBoundingClientRect(); return r.top < innerHeight * 0.5 && r.bottom > 0; }));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.hero__actions').getByRole('link', { name: 'Visit the Store' }).click();
  await page.waitForTimeout(900);
  check(T('"Visit the Store" reaches Visit'), await page.evaluate(() => { const r = document.getElementById('visit').getBoundingClientRect(); return r.top < innerHeight * 0.6 && r.bottom > 0; }));

  // Navigation
  if (width <= 900) {
    const toggle = page.locator('[data-menu-toggle]');
    await toggle.click();
    check(T('mobile menu opens'), await page.locator('[data-menu]').isVisible());
    await page.screenshot({ path: join(out, `${label}-menu.png`) });
    await page.keyboard.press('Escape');
    check(T('mobile menu closes with Esc'), !(await page.locator('[data-menu]').isVisible()));
    await toggle.click();
    await page.locator('[data-menu]').getByRole('link', { name: 'Interior' }).click();
    await page.waitForTimeout(900);
    check(T('mobile menu link navigates and closes'), !(await page.locator('[data-menu]').isVisible()) && await page.evaluate(() => document.getElementById('interior').getBoundingClientRect().top < innerHeight * 0.5));
  } else {
    await page.locator('.nav__links').getByRole('link', { name: 'The Humidor' }).click();
    await page.waitForTimeout(1000);
    check(T('nav link scrolls to Humidor'), await page.evaluate(() => Math.abs(document.getElementById('humidor').getBoundingClientRect().top) < 120));
    check(T('active section highlighted'), await page.locator('.nav__links a.is-active').innerText().then((t) => t.includes('Humidor')).catch(() => false));
    check(T('nav turns solid after hero'), await page.locator('[data-nav]').evaluate((n) => n.classList.contains('is-solid')));
  }

  // Digital Humidor
  await page.locator('#humidor').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector('[data-viewer]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(600);
  const count = page.locator('[data-count]');
  check(T('humidor starts on view 1'), (await count.innerText()).startsWith('01'));
  await page.locator('[data-next]').click();
  await page.waitForTimeout(400);
  check(T('next arrow advances view'), (await count.innerText()).startsWith('02') && (await page.locator('#tab-1').getAttribute('aria-selected')) === 'true');
  await page.locator('#tab-1').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  check(T('keyboard arrow on tabs advances'), (await count.innerText()).startsWith('03'));
  await page.locator('[data-prev]').click();
  await page.waitForTimeout(300);
  check(T('prev arrow goes back'), (await count.innerText()).startsWith('02'));
  await page.locator('#tab-5').click();
  await page.waitForTimeout(300);
  check(T('thumbnail selects view'), (await count.innerText()).startsWith('06'));
  // Swipe / drag on the stage
  const box = await page.locator('[data-stage]').boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  check(T('horizontal drag changes view'), (await count.innerText()).startsWith('01'));
  await page.waitForTimeout(900);
  await page.locator('[data-viewer]').screenshot({ path: join(out, `${label}-humidor.png`) });

  // Inspector
  await page.locator('[data-inspect]').click();
  const dlg = page.locator('[data-inspector]');
  check(T('full-screen viewer opens'), await dlg.isVisible());
  await page.locator('[data-zoom-in]').click();
  await page.waitForTimeout(300);
  check(T('zoom in works'), (await page.locator('[data-zoom-level]').innerText()) === '150%');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, `${label}-inspector.png`) });
  await page.keyboard.press('0');
  check(T('reset zoom'), (await page.locator('[data-zoom-level]').innerText()) === '100%');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check(T('Esc closes viewer'), !(await dlg.isVisible()));
  check(T('viewer navigation syncs Humidor'), (await count.innerText()).startsWith('02'));
  check(T('focus returns to trigger'), await page.evaluate(() => document.activeElement?.hasAttribute('data-inspect')));

  // Gallery
  const tileBtn = page.locator('.tile__btn').first();
  if (await tileBtn.count()) {
    await tileBtn.click();
    check(T('gallery photo opens viewer'), await dlg.isVisible());
    await page.locator('[data-close]').click();
    check(T('close button closes viewer'), !(await dlg.isVisible()));
  } else {
    check(T('gallery shows labeled pending panels'), (await page.locator('.gallery .pending').count()) === 5);
  }
  const play = page.locator('.play').first();
  if (await play.count()) {
    await play.click();
    await page.waitForTimeout(600);
    check(T('video plays only on request'), await page.locator('.tile video').count() === 1);
  }
  const autoplay = await page.locator('video[autoplay]').count();
  check(T('no autoplay video'), autoplay === 0);

  // Content guardrails
  const text = (await page.locator('body').innerText()).toLowerCase();
  check(T('no cart/checkout wording'), !/add to cart|checkout|buy now|order online|shipping|delivery available/.test(text));
  check(T('no 360-degree claims'), !/360/.test(text));
  check(T('no lounge/membership claims'), !/lounge|membership|reservation|cocktail/.test(text));
  check(T('legal age stated'), /21 or older/.test(text));
  check(T('no unverified phone link'), (await page.locator('a[href^="tel:"]').count()) === 0 || await page.evaluate(() => !!window.CM_BUSINESS.phone));

  check(T('no console or page errors'), errors.length === 0, errors.join(' | '));
  check(T('no failed same-origin requests'), failed.length === 0, failed.join(', '));
  await ctx.close();
}

// Reduced motion: content visible without animation
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  const hidden = await page.evaluate(() => [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity !== '1').length);
  check('[reduced-motion] all content visible immediately', hidden === 0, `${hidden} hidden`);
  const smooth = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  check('[reduced-motion] smooth scrolling off', smooth === 'auto');
  await ctx.close();
}

await browser.close();
server.close();
const failedChecks = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok || !r.detail ? '' : `  -> ${r.detail}`}`);
console.log(`\n${results.length - failedChecks.length}/${results.length} checks passed. Screenshots: ${out}`);
process.exit(failedChecks.length ? 1 : 0);
