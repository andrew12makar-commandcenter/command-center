import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {buildExampleBlueprint, buildExampleLoop} from './example-business.mjs';
import {
  contrastRatio,
  parseColor,
  scoreBoilerplate,
  scoreFontLoading,
  scoreHeadingHierarchy,
  scoreImageAlt,
  scoreOverflow,
  scorePerf,
  scoreSectionVariety,
  scoreSiteDirectory,
} from './score-lib.mjs';

const GOOD = `<!DOCTYPE html><html lang="en"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="styles.css">
</head><body>
<h1>Example data shop</h1>
<section class="hero"><p>A specific first sentence about example data.</p></section>
<section id="services" class="menu"><table><tr><th>Example data cut</th><td>30 min</td></tr></table></section>
<section id="book" class="booking"><blockquote><p>Example data booking note.</p></blockquote></section>
<section id="visit"><address>1 Example Data Street</address></section>
<img alt="Example data storefront illustration" src="mark.svg">
</body></html>`;

const GOOD_CSS = `@font-face{font-family:'Fraunces';font-display:swap;src:url(fonts/fraunces.woff2) format('woff2')}
@font-face{font-family:'Source Sans 3';font-display:swap;src:url(fonts/source.woff2) format('woff2')}
body{font-family:'Source Sans 3',sans-serif}h1{font-family:'Fraunces',serif}`;

test('contrast ratio matches the WCAG black/white and gray boundaries', () => {
  assert.ok(Math.abs(contrastRatio(parseColor('#000000'), parseColor('#ffffff')) - 21) < 0.01);
  assert.ok(contrastRatio(parseColor('#767676'), parseColor('#ffffff')) >= 4.5);
  assert.ok(contrastRatio(parseColor('#777777'), parseColor('#ffffff')) < 4.5);
});

test('heading hierarchy fails two h1s and skipped levels', () => {
  const good = scoreHeadingHierarchy(GOOD);
  assert.equal(good.pass, true);
  assert.equal(good.score, 12);
  const doubled = scoreHeadingHierarchy('<h1>One</h1><h1>Two</h1>');
  assert.equal(doubled.score, 0);
  const skipped = scoreHeadingHierarchy('<h1>One</h1><h3>Jumped</h3>');
  assert.equal(skipped.pass, false);
  assert.ok(skipped.score < 12);
});

test('section variety rewards distinct structures and rich patterns', () => {
  const varied = scoreSectionVariety(GOOD);
  assert.ok(varied.score >= 12, varied.detail);
  const flat = scoreSectionVariety('<section class="card"><h2>One</h2></section><section class="card"><h2>Two</h2></section>');
  assert.ok(flat.score < varied.score);
});

test('image alt, fonts, and boilerplate are scored from the markup', () => {
  assert.equal(scoreImageAlt(GOOD).score, 10);
  assert.equal(scoreImageAlt('<img src="x.jpg">').score, 0);
  assert.equal(scoreImageAlt('<p>No pictures</p>').score, 4);
  assert.equal(scoreFontLoading(GOOD, GOOD_CSS).score, 14);
  assert.equal(scoreFontLoading('<p>Hi</p>', 'body{font-family:system-ui}').score, 0);
  const named = scoreFontLoading('<p>Hi</p>', "h1{font-family:'Newsreader',Georgia,serif}body{font-family:'Manrope',system-ui}");
  assert.equal(named.score, 3);
  const inlined = scoreFontLoading("<style>h1{font-family:'Literata',Georgia,serif}body{font:16px/1.6 'Inter Tight',system-ui,sans-serif}</style><p>Hi</p>", '');
  assert.equal(inlined.score, 3);
  const system = scoreFontLoading('<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}</style>', '');
  assert.equal(system.score, 0);
  const boilerplate = scoreBoilerplate('<p>Expertise organized around what comes next. Starting a conversation.</p>');
  assert.equal(boilerplate.pass, false);
  assert.ok(boilerplate.score <= 4);
  assert.equal(scoreBoilerplate('<p>Example data haircut, booked on the example page.</p>').pass, true);
});

test('overflow and the byte budget use supplied measurements', () => {
  assert.equal(scoreOverflow({width: 390, scrollWidth: 390, clientWidth: 390, offenders: []}).score, 14);
  assert.equal(scoreOverflow({width: 390, scrollWidth: 390, clientWidth: 390, offenders: ['a.skip']}).score, 14);
  assert.equal(scoreOverflow({width: 390, scrollWidth: 480, clientWidth: 390, offenders: ['div.wide']}).score, 0);
  const light = scorePerf({htmlBytes: 10000, cssBytes: 10000, jsBytes: 0, fontBytes: 100000, imageBytes: 0, viewport: true, remoteFontStylesheets: 0});
  assert.equal(light.score, 12);
  const heavy = scorePerf({htmlBytes: 20000, cssBytes: 80000, jsBytes: 400000, fontBytes: 0, imageBytes: 0, viewport: true, remoteFontStylesheets: 1});
  assert.ok(heavy.score < light.score);
});

test('a directory score reads index.html and linked css', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'qa-generator-'));
  try {
    await mkdir(join(dir, 'fonts'));
    await writeFile(join(dir, 'index.html'), GOOD);
    await writeFile(join(dir, 'fonts.css'), GOOD_CSS);
    await writeFile(join(dir, 'styles.css'), 'p{color:#1b1613}');
    await writeFile(join(dir, 'fonts/fraunces.woff2'), Buffer.alloc(120));
    const report = await scoreSiteDirectory(dir, {
      overflow: {width: 390, scrollWidth: 390, clientWidth: 390, offenders: []},
      contrast: [{text: 'Example', ratio: 12, large: true, pass: true}],
    });
    assert.equal(report.max, 100);
    assert.ok(report.score >= 90, JSON.stringify(report.checks, null, 2));
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});

test('the example business is unlabeled as owner-approved and has no matched concept set', () => {
  const {site, conceptMedia, resolved} = buildExampleBlueprint();
  assert.notEqual(site.content.factStatus, 'owner_approved');
  assert.equal(site.content.factStatus, 'unreviewed');
  assert.equal(site.businessName, 'Example Data Barbers');
  assert.equal(conceptMedia, null);
  assert.equal(resolved.template, 'universal');
  assert.match(site.internalDisclaimer, /not affiliated with or endorsed/i);
  const loop = buildExampleLoop();
  assert.match(loop.html, /Example Data Barbers/);
  assert.equal(loop.html.includes('@font-face'), false);
  assert.equal(loop.candidate.imageryDensity, 'none');
});

test('committed score files, when present, match a fresh directory read', async () => {
  const saved = join(import.meta.dirname, 'output', 'scores.json');
  try {
    const parsed = JSON.parse(await readFile(saved, 'utf8'));
    assert.ok(Array.isArray(parsed.sites));
    assert.ok(parsed.sites.every((site) => typeof site.score === 'number' && site.max === 100));
  } catch (error) {
    if (error && error.code === 'ENOENT') return;
    throw error;
  }
});
