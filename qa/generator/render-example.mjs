#!/usr/bin/env node
// Write the production page as renderSite HTML (no Next.js, no JavaScript)
// and screenshot it. Also writes the unwired renderSite document so the
// before/after scores are both real documents, and the Brighton Barbers page.
import {cp, mkdir, rm, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {createDraft, defaultPreferences} from '../../lib/demo-engine.ts';
import {buildSiteBlueprint} from '../../lib/site-blueprint.ts';
import {renderSite} from '../../lib/design-system/render.ts';
import {renderWiredSite} from '../../components/site-design-document.ts';
import {buildExampleBlueprint, exampleFacts} from './example-business.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outRoot = join(root, 'qa', 'generator', 'output');
const fonts = ['fraunces-9e509503.woff2', 'sourcesans3-e6c9ca63.woff2'];

function serve(dir) {
  const types = {'.html': 'text/html', '.woff2': 'font/woff2', '.css': 'text/css'};
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const rel = decodeURIComponent(url.pathname);
      const path = join(dir, rel === '/' ? 'index.html' : rel.replace(/^\/+/, ''));
      const body = await readFile(path);
      res.writeHead(200, {'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store'});
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

async function writeDocument(dir, html) {
  await rm(dir, {recursive: true, force: true});
  await mkdir(join(dir, 'fonts'), {recursive: true});
  await mkdir(join(dir, 'screenshots'), {recursive: true});
  await writeFile(join(dir, 'index.html'), html);
  for (const file of fonts) {
    await cp(join(root, 'lib', 'design-system', 'fonts', file), join(dir, 'fonts', file));
  }
}

async function shoot(browser, dir) {
  const server = await serve(dir);
  const port = server.address().port;
  const shots = [
    {name: 'desktop-1440.png', width: 1440, height: 900, full: false},
    {name: 'desktop-1440-full.png', width: 1440, height: 900, full: true},
    {name: 'mobile-390.png', width: 390, height: 844, full: false},
    {name: 'mobile-390-full.png', width: 390, height: 844, full: true},
  ];
  try {
    for (const shot of shots) {
      const context = await browser.newContext({
        viewport: {width: shot.width, height: shot.height},
        isMobile: shot.width < 500,
        hasTouch: shot.width < 500,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${port}/`, {waitUntil: 'networkidle'});
      await page.screenshot({path: join(dir, 'screenshots', shot.name), fullPage: shot.full});
      await context.close();
    }
  } finally {
    await new Promise((done) => server.close(done));
  }
}

function stockExampleHtml() {
  const facts = exampleFacts();
  return renderSite({
    category: 'barber',
    businessName: facts.name,
    hero: {headline: facts.name, support: facts.address},
    services: facts.offerings.map((name) => ({name, price: null})),
    about: {body: facts.about},
    hoursLocation: {address: facts.address, hours: facts.hours.join('\n'), phone: facts.phone, email: facts.email},
    footer: {note: 'Example data. Not a real shop.'},
  }, {fontBase: './fonts'}).replaceAll('url("./fonts/', 'url("fonts/');
}

function wiredExampleHtml() {
  const built = buildExampleBlueprint();
  const facts = exampleFacts();
  if (built.site.content.factStatus === 'owner_approved') throw new Error('Example fixture must not be owner_approved.');
  return renderWiredSite(built.site, {
    conceptMedia: built.conceptMedia,
    fontHref: 'fonts/',
    recorded: {address: facts.address, hours: facts.hours.join('\n')},
  });
}

function brightonHtml() {
  const draft = createDraft('Brighton Barbers', null, 'barber', 'universal', defaultPreferences());
  draft.services = [];
  draft.siteContent = {...draft.siteContent, about: '', appointmentUrl: null, factStatus: 'unreviewed', images: [], generatedImageryEnabled: false};
  const site = buildSiteBlueprint('universal', draft, {name: 'Brighton Barbers', category: 'barber'});
  if (site.content.factStatus === 'owner_approved' || site.quality.publishReady) throw new Error('Brighton preview must stay unapproved.');
  return renderWiredSite(site, {fontHref: 'fonts/', recorded: {address: '8 Chestnut Hill Ave'}});
}

export async function renderExample() {
  const productionDir = join(outRoot, 'example-data-barbers');
  const beforeDir = join(outRoot, 'example-data-barbers-render-site-before');
  const brightonDir = join(outRoot, 'brighton-barbers-after');
  await writeDocument(productionDir, wiredExampleHtml());
  await writeDocument(beforeDir, stockExampleHtml());
  await writeDocument(brightonDir, brightonHtml());
  await writeFile(join(brightonDir, 'facts.json'), JSON.stringify({
    confirmed: ['Brighton Barbers', '8 Chestnut Hill Ave'],
    everythingElse: 'to confirm',
    ownerApproved: false,
  }, null, 2) + '\n');
  const {chromium} = await import('@playwright/test');
  const browser = await chromium.launch({
    executablePath: process.env.QA_CHROMIUM_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-gpu', '--no-zygote'],
  });
  try {
    await shoot(browser, productionDir);
    await shoot(browser, beforeDir);
    await shoot(browser, brightonDir);
  } finally {
    await browser.close();
  }
  console.log('Wrote static renderSite documents under', outRoot);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  renderExample().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}
