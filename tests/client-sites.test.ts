import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_SITES, branchUrl, getClientSite, hasHostedPreview, isOpenState, openItems, parseStatusMarkdown, previewSrc, repoUrl, sitesInCollection } from '../lib/client-sites.ts';
import { existsSync } from 'node:fs';
import { INTERNAL_DEMO_SITES, internalDemoUrl, resolveDemoFile } from '../lib/demo-site-files.ts';

const SAMPLE = `# Status: 2 Nov 2026

| Area | State | Evidence |
|---|---|---|
| Intro | Working | d1 |
| Gyro restaurant | Placeholder: labelled layout preview | d4 |
| GitHub repo / branch previews | **NOT DONE**. No repo yet. | \`docs/SESSION_HANDOFF.md\` |

## 3 Nov: layers (all PROPOSED, waiting for owner approval)
| Layer | What | Test |
|---|---|---|
| gyro-facts | Name and sections | PASS |
| gyro-opening | Opening pan | Inert: file not received |

## 3 Nov (later)
| Item | State | Test |
|---|---|---|
| Main demo shows the proposed layers | DONE | published v3 |
| Front-door sign (medium confidence, needs confirmation) | DONE | PASS |
`;

test('registry slugs are unique and every site has https links, a collection, and owned branches', () => {
  const slugs = CLIENT_SITES.map((s) => s.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const site of CLIENT_SITES) {
    assert.match(site.liveUrl, /^https:\/\//);
    assert.ok(site.collection === 'build' || site.collection === 'demo', `${site.slug} needs a collection`);
    for (const b of site.branches) {
      assert.ok(b.owner.length > 0, `${site.slug}:${b.name} needs an owner`);
      if (b.previewUrl) assert.match(b.previewUrl, /^https:\/\//);
    }
  }
});

test('Circle Tavern is the current sold Client Build', () => {
  const site = getClientSite('circle-tavern');
  assert.ok(site);
  assert.equal(site.collection, 'build');
  assert.equal(site.stage, 'Live');
  assert.equal(site.liveUrl, 'https://www.thecircletavern.com/');
  assert.equal(site.pinnedUrl, 'https://2f6b8925.circle-tavern-official.pages.dev');
  assert.match(site.saleNote ?? '', /George/i);
  assert.match(site.saleNote ?? '', /\$1,000/);
  assert.equal(site.repo.host, 'gitlab');
  assert.equal(site.repo.name, 'circle-venu');
  assert.equal(site.repo.defaultBranch, 'release/live-20261114');
  assert.equal(repoUrl(site), 'https://gitlab.com/andrew-makar-personal-projects-group/circle-venu');
  assert.equal(site.branches[0]?.commitSha, '9ec7cd8795cc9bef5ab72054249979314679a380');
  assert.equal(sitesInCollection('build').map((s) => s.slug).join(','), 'circle-tavern');
  assert.deepEqual(site.alsoIn, ['demo']);
});

test("Johnny D's r8 is the current Client Demo and is not duplicated", () => {
  const matches = CLIENT_SITES.filter((s) => /johnny/i.test(s.slug) || /johnny/i.test(s.name));
  assert.equal(matches.length, 1);
  const site = getClientSite('johnnyds');
  assert.ok(site);
  assert.equal(site.collection, 'demo');
  assert.equal(site.stage, 'In review');
  assert.equal(site.liveUrl, 'https://r8.johnnyds-preview.pages.dev');
  assert.equal(site.pinnedUrl, 'https://f0ba5452.johnnyds-preview.pages.dev');
  assert.equal(site.repo.host, 'gitlab');
  assert.equal(site.repo.name, 'johnnyds-site');
  assert.equal(site.repo.defaultBranch, 'r8');
  assert.equal(branchUrl(site, 'r8'), 'https://gitlab.com/andrew-makar-personal-projects-group/johnnyds-site/-/tree/r8');
  assert.equal(site.branches[0]?.commitSha, 'adc086f8887a9bf21ac1be0ed7db9cf2ed9da480');
});

test('Oliveira Deli Market (Client Demo 05) is live on oliveirasdeli.com with the r1 demo kept as a second branch', () => {
  const matches = CLIENT_SITES.filter((s) => /oliveira/i.test(s.slug) || /oliveira/i.test(s.name));
  assert.equal(matches.length, 1);
  const site = getClientSite('oliveira-deli');
  assert.ok(site);
  assert.equal(site.collection, 'demo');
  assert.equal(site.stage, 'Live');
  assert.equal(site.liveUrl, 'https://oliveirasdeli.com/');
  assert.equal(site.pinnedUrl, 'https://228ecf5a.oliveira-deli-official.pages.dev');
  assert.match(site.hosting, /oliveira-deli-official/);
  assert.match(site.hosting, /oliveirasdeli\.com/);
  assert.equal(site.repo.host, 'gitlab');
  assert.equal(site.repo.name, 'oliveira-deli-site');
  assert.equal(site.repo.defaultBranch, 'main');
  assert.deepEqual(site.branches.map((b) => b.name), ['main', 'r1']);
  const main = site.branches[0];
  assert.equal(main?.previewUrl, site.liveUrl);
  assert.equal(main?.commitSha, '4a77cd3d559c3586b5f37488b75de1d6d8fbda3c');
  assert.equal(main?.commitUrl, `https://gitlab.com/andrew-makar-personal-projects-group/oliveira-deli-site/-/commit/${main?.commitSha}`);
  assert.equal(branchUrl(site, 'main'), 'https://gitlab.com/andrew-makar-personal-projects-group/oliveira-deli-site/-/tree/main');
  assert.equal(site.branches[1]?.previewUrl, 'https://r1.oliveira-deli-preview.pages.dev');
  assert.equal(site.branches[1]?.commitSha, 'a9a43b07334354c344a2e58b7d78f7cfc717516a');
  assert.match(site.summary, /provisional/);
  assert.match(site.summary, /4a77cd3d/);
});

test('Zisis Convenience r1 is Client Demo 04 on GitLab with the verified Pages preview and a thumbnail', () => {
  const matches = CLIENT_SITES.filter((s) => /zisis|zz's|client demo 04/i.test(`${s.slug} ${s.name} ${s.summary}`));
  assert.equal(matches.length, 1);
  const site = getClientSite('zisis-convenience');
  assert.ok(site);
  assert.equal(site.name, 'Zisis Convenience Store');
  assert.equal(site.collection, 'demo');
  assert.equal(site.alsoIn, undefined);
  assert.equal(site.stage, 'In review');
  assert.equal(site.liveUrl, 'https://r1.zisis-convenience-preview.pages.dev');
  assert.equal(site.pinnedUrl, 'https://f6eb2f37.zisis-convenience-preview.pages.dev');
  assert.match(site.hosting, /Cloudflare Pages.*zisis-convenience-preview/);
  assert.match(site.summary, /^Interactive neighborhood convenience-store website concept/);
  assert.equal(site.repo.host, 'gitlab');
  assert.equal(repoUrl(site), 'https://gitlab.com/andrew-makar-personal-projects-group/zisis-convenience-site');
  assert.equal(branchUrl(site, 'r1'), 'https://gitlab.com/andrew-makar-personal-projects-group/zisis-convenience-site/-/tree/r1');
  assert.deepEqual(site.branches.map((b) => b.name), ['r1']);
  const r1 = site.branches[0];
  assert.equal(r1?.previewUrl, site.liveUrl);
  assert.equal(r1?.commitSha, '298885e6410c062af77c0b1b9c5f42ff217a8ca4');
  assert.equal(r1?.commitUrl, `https://gitlab.com/andrew-makar-personal-projects-group/zisis-convenience-site/-/commit/${r1?.commitSha}`);
  assert.equal(site.thumbnail?.src, '/client-sites/zisis-convenience.jpg');
  assert.ok((site.thumbnail?.alt ?? '').length > 10);
  // only Zisis and Brighton Cellar carry thumbnails; other entries unchanged
  assert.deepEqual(CLIENT_SITES.filter((s) => s.thumbnail).map((s) => s.slug), ['zisis-convenience', 'brighton-cellar-gourmet', 'kikis-kwikmart', 'cigars-and-more', 'ensueno-skin-care', 'los-amigos-taqueria', 'little-pizza-king']);
});

test('Brighton Cellar & Gourmet r1 is one Client Demo on GitLab with the verified Pages preview and a thumbnail', () => {
  const matches = CLIENT_SITES.filter((s) => /brighton cellar|brighton gourmet|brighton-cellar/i.test(`${s.slug} ${s.name}`));
  assert.equal(matches.length, 1);
  const site = getClientSite('brighton-cellar-gourmet');
  assert.ok(site);
  assert.equal(site.name, 'Brighton Cellar & Gourmet');
  assert.equal(site.collection, 'demo');
  assert.equal(site.alsoIn, undefined);
  assert.equal(site.stage, 'In review');
  assert.match(site.client, /569 Washington Street, Brighton, MA 02135/);
  assert.match(site.summary, /^Client Demo 06/);
  assert.equal(site.liveUrl, 'https://r1.brighton-cellar-gourmet-preview.pages.dev');
  assert.equal(site.pinnedUrl, 'https://e2752fc5.brighton-cellar-gourmet-preview.pages.dev');
  assert.match(site.hosting, /Cloudflare Pages.*brighton-cellar-gourmet-preview/);
  assert.equal(repoUrl(site), 'https://gitlab.com/andrew-makar-personal-projects-group/brighton-cellar-gourmet');
  assert.equal(branchUrl(site, 'r1'), 'https://gitlab.com/andrew-makar-personal-projects-group/brighton-cellar-gourmet/-/tree/r1');
  const r1 = site.branches[0];
  assert.deepEqual(site.branches.map((b) => b.name), ['r1']);
  assert.equal(r1?.previewUrl, site.liveUrl);
  assert.equal(r1?.commitSha, '13ce29dd811fa3c796bfdb12cde7c6fc45b1c81a');
  assert.equal(r1?.commitUrl, `https://gitlab.com/andrew-makar-personal-projects-group/brighton-cellar-gourmet/-/commit/${r1?.commitSha}`);
  assert.equal(site.thumbnail?.src, '/client-sites/brighton-cellar-gourmet.jpg');
  // demo numbers stay unique: 04 Zisis, 05 Oliveira, 06 Brighton
  for (const n of ['04', '05', '06']) assert.equal(CLIENT_SITES.filter((s) => s.summary.includes(`Client Demo ${n}`)).length, 1, `Client Demo ${n}`);
});

test('Client Demos lists Universal Barber Shop r4, Johnny D\'s r8, Zisis r1, Oliveira r1, Brighton Cellar r1, Kiki\'s r1 and Circle Tavern (sold, also shown as a demo)', () => {
  assert.equal(sitesInCollection('demo').map((s) => s.slug).join(','), 'johnnyds,universal-barber,zisis-convenience,oliveira-deli,brighton-cellar-gourmet,kikis-kwikmart,cigars-and-more,ensueno-skin-care,los-amigos-taqueria,little-pizza-king,circle-tavern');
  const u = getClientSite('universal-barber');
  assert.ok(u);
  assert.equal(u.collection, 'demo');
  assert.equal(u.liveUrl, 'https://r4.universal-barber-preview.pages.dev');
  assert.equal(u.pinnedUrl, 'https://80efd175.universal-barber-preview.pages.dev');
  assert.equal(u.repo.defaultBranch, 'r4');
  assert.deepEqual(u.branches.map((b) => b.name), ['r4', 'r3', 'r2', 'r1']);
  assert.match(u.branches[1]?.note ?? '', /fallback/i);
  assert.equal(u.branches[1]?.previewUrl, 'https://r3.universal-barber-preview.pages.dev');
  // a site appears at most once per section
  for (const c of ['build', 'demo'] as const) {
    const slugs = sitesInCollection(c).map((s) => s.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  }
});

test('status markdown parses into sections and flags open items', () => {
  const { title, sections } = parseStatusMarkdown(SAMPLE);
  assert.equal(title, 'Status: 2 Nov 2026');
  assert.equal(sections.length, 3);
  assert.deepEqual(sections[0].columns, ['Area', 'State', 'Evidence']);
  assert.equal(sections[0].rows[2].cells[1], 'NOT DONE. No repo yet.');
  assert.equal(sections[0].rows[2].cells[2], 'docs/SESSION_HANDOFF.md');
  assert.deepEqual(openItems(sections).map((o) => o.item), ['Gyro restaurant', 'GitHub repo / branch previews', 'gyro-facts', 'gyro-opening', 'Front-door sign (medium confidence, needs confirmation)']);
});

test('open-state detection', () => {
  assert.equal(isOpenState('Working'), false);
  assert.equal(isOpenState('Demo mode only: nothing is sent'), true);
  assert.equal(isOpenState('PASS'), false);
});

test('Kiki’s Kwik-Mart r1 is one Client Demo 07 on GitLab with the verified Pages preview and a thumbnail', () => {
  const matches = CLIENT_SITES.filter((s) => /kiki/i.test(`${s.slug} ${s.name}`));
  assert.equal(matches.length, 1);
  const site = getClientSite('kikis-kwikmart');
  assert.ok(site);
  assert.equal(site.collection, 'demo');
  assert.equal(site.stage, 'In review');
  assert.match(site.client, /236 Faneuil Street, Brighton, MA 02135/);
  assert.match(site.summary, /^Client Demo 07/);
  assert.equal(site.liveUrl, 'https://r1.kikis-kwikmart-preview.pages.dev');
  assert.equal(site.pinnedUrl, 'https://58cb9288.kikis-kwikmart-preview.pages.dev');
  assert.equal(repoUrl(site), 'https://gitlab.com/andrew-makar-personal-projects-group/kikis-kwikmart-demo');
  assert.equal(branchUrl(site, 'r1'), 'https://gitlab.com/andrew-makar-personal-projects-group/kikis-kwikmart-demo/-/tree/r1');
  const r1 = site.branches[0];
  assert.equal(r1?.commitSha, '477ddba771878350197c28d6c4938e7b1f5e88b2');
  assert.equal(r1?.previewUrl, site.liveUrl);
  assert.equal(site.thumbnail?.src, '/client-sites/kikis-kwikmart.jpg');
  for (const n of ['04', '05', '06', '07', '08']) assert.equal(CLIENT_SITES.filter((s) => s.summary.startsWith(`Client Demo ${n}`) || s.summary.includes(`Client Demo ${n},`) || s.summary.includes(`Client Demo ${n} (`)).length, 1, `Client Demo ${n}`);
});

test('Cigars & More r1 is Client Demo 08 on GitLab, not publicly deployed, viewable inside the Command Center', () => {
  const matches = CLIENT_SITES.filter((s) => /cigars/i.test(`${s.slug} ${s.name}`));
  assert.equal(matches.length, 1);
  const site = getClientSite('cigars-and-more');
  assert.ok(site);
  assert.equal(site.name, 'Cigars & More');
  assert.equal(site.collection, 'demo');
  assert.equal(site.alsoIn, undefined);
  assert.equal(site.stage, 'In build');
  assert.match(site.summary, /^Client Demo 08/);
  assert.match(site.summary, /Digital Humidor/);
  assert.match(site.summary, /not deployed/i);
  assert.match(site.hosting, /Not deployed/);
  assert.equal(site.liveUrl, 'https://gitlab.com/andrew-makar-personal-projects-group/cigars-and-more-site');
  assert.equal(site.pinnedUrl, undefined);
  assert.equal(site.thumbnail?.src, '/client-sites/cigars-and-more.jpg');
  assert.ok(existsSync(`public${site.thumbnail?.src}`));
  assert.equal(site.internalPreview, '/app/demo-sites/cigars-and-more/index.html');
  assert.equal(previewSrc(site), '/app/demo-sites/cigars-and-more/index.html');
  assert.equal(hasHostedPreview(site), false);
  assert.equal(site.repo.host, 'gitlab');
  assert.equal(site.repo.name, 'cigars-and-more-site');
  assert.equal(site.repo.defaultBranch, 'r1');
  assert.equal(repoUrl(site), 'https://gitlab.com/andrew-makar-personal-projects-group/cigars-and-more-site');
  assert.equal(branchUrl(site, 'r1'), 'https://gitlab.com/andrew-makar-personal-projects-group/cigars-and-more-site/-/tree/r1');
  const r1 = site.branches[0];
  assert.deepEqual(site.branches.map((b) => b.name), ['r1']);
  assert.equal(r1?.previewUrl, undefined);
  assert.equal(r1?.commitSha, '6ff5134b0c7bd9da54b44d96cbdf03aa097e263c');
  assert.equal(r1?.commitUrl, `https://gitlab.com/andrew-makar-personal-projects-group/cigars-and-more-site/-/commit/${r1?.commitSha}`);
  assert.match(r1?.note ?? '', /388cc35/);
  assert.match(r1?.note ?? '', /claude\/cigars-more-storefront-ggh2sl/);
});

test('Ensueno Skin Care (Client Demo 10, Lane B) is a preview-only demo on its own Pages project', () => {
  const matches = CLIENT_SITES.filter((s) => /ensue/i.test(s.slug) || /ensue/i.test(s.name));
  assert.equal(matches.length, 1);
  const site = getClientSite('ensueno-skin-care');
  assert.ok(site);
  assert.equal(site.collection, 'demo');
  assert.equal(site.stage, 'In review');
  assert.equal(site.liveUrl, 'https://r1.ensueno-skin-care-preview.pages.dev');
  assert.equal(site.pinnedUrl, 'https://bcde5d98.ensueno-skin-care-preview.pages.dev');
  assert.equal(site.repo.host, 'gitlab');
  assert.equal(site.repo.name, 'ensueno-skin-care-site');
  assert.equal(site.repo.defaultBranch, 'r1');
  assert.equal(repoUrl(site), 'https://gitlab.com/andrew-makar-personal-projects-group/ensueno-skin-care-site');
  assert.equal(site.branches[0]?.commitSha, 'c245eaabfc6390842ed35e4e64841b5260afcbaf');
  assert.equal(site.thumbnail?.src, '/client-sites/ensueno-skin-care.jpg');
  assert.match(site.summary, /No prices shown/);
});

test('Los Amigos Taqueria Brighton (Client Demo 12, Lane B) is a preview-only demo that orders through ChowNow', () => {
  const matches = CLIENT_SITES.filter((s) => /amigos/i.test(s.slug) || /amigos/i.test(s.name));
  assert.equal(matches.length, 1);
  const site = getClientSite('los-amigos-taqueria');
  assert.ok(site);
  assert.equal(site.collection, 'demo');
  assert.equal(site.stage, 'In review');
  assert.equal(site.liveUrl, 'https://r1.los-amigos-taqueria-preview.pages.dev');
  assert.equal(site.pinnedUrl, 'https://d2e24c37.los-amigos-taqueria-preview.pages.dev');
  assert.equal(site.repo.name, 'los-amigos-taqueria-site');
  assert.equal(repoUrl(site), 'https://gitlab.com/andrew-makar-personal-projects-group/los-amigos-taqueria-site');
  assert.equal(site.branches[0]?.commitSha, 'c408a1659adf5ee7f0fdea1fcfd38a779e23b159');
  assert.equal(site.thumbnail?.src, '/client-sites/los-amigos-taqueria.jpg');
  assert.match(site.summary, /ChowNow/);
});

test('sites with nothing deployed are not framed; deployed previews are', () => {
  const cigars = getClientSite('cigars-and-more');
  assert.ok(cigars);
  assert.equal(hasHostedPreview(cigars), false);
  for (const slug of ['ensueno-skin-care', 'los-amigos-taqueria', 'brighton-cellar-gourmet', 'circle-tavern']) {
    const site = getClientSite(slug);
    assert.ok(site);
    assert.equal(hasHostedPreview(site), true, slug);
  }
});


test('Little Pizza King has a hosted preview and a matching source revision', () => {
  const site = getClientSite('little-pizza-king');
  assert.ok(site);
  assert.equal(site.collection, 'demo');
  assert.equal(site.liveUrl, 'https://r1.little-pizza-king-preview.pages.dev');
  assert.equal(hasHostedPreview(site), true);
  assert.equal(site.branches[0]?.commitSha, '915ba7cf005667603bef2b1a1ac8407859b97931');
});

test('previewSrc prefers the in-app copy, then a hosted preview, else nothing', () => {
  const hosted = getClientSite('johnnyds');
  assert.ok(hosted);
  assert.equal(previewSrc(hosted), hosted.liveUrl);
  const base = { ...hosted, liveUrl: repoUrl(hosted) };
  assert.equal(previewSrc(base), null);
  assert.equal(previewSrc({ ...base, internalPreview: '/app/demo-sites/x' }), '/app/demo-sites/x');
});

test('every internalPreview is served by an in-repo demo folder that has an index.html', () => {
  for (const site of CLIENT_SITES.filter((s) => s.internalPreview)) {
    assert.equal(site.internalPreview, internalDemoUrl(site.slug));
    const dir = INTERNAL_DEMO_SITES[site.slug];
    assert.ok(dir, `${site.slug} is not in INTERNAL_DEMO_SITES`);
    assert.ok(existsSync(`${dir}/index.html`), `${dir}/index.html missing`);
  }
});

test('resolveDemoFile serves only known demo files and never leaves the site folder', () => {
  const index = resolveDemoFile('cigars-and-more', ['index.html']);
  assert.ok(index);
  assert.match(index.contentType, /text\/html/);
  assert.ok(existsSync(index.file));
  const css = resolveDemoFile('cigars-and-more', ['styles.css']);
  assert.ok(css && existsSync(css.file));
  assert.equal(resolveDemoFile('cigars-and-more', []), null); // bare slug is redirected by the route
  assert.ok(resolveDemoFile('cigars-and-more', ['media', 'media.generated.js']));
  assert.equal(resolveDemoFile('unknown-site', []), null);
  assert.equal(resolveDemoFile('cigars-and-more', ['..', 'scripts', 'prepare_media.py']), null);
  assert.equal(resolveDemoFile('cigars-and-more', ['..', '..', '..', 'package.json']), null);
  assert.equal(resolveDemoFile('cigars-and-more', ['.env']), null);
  assert.equal(resolveDemoFile('cigars-and-more', ['media', '../../../package.json']), null);
  assert.equal(resolveDemoFile('cigars-and-more', ['media/../../scripts/prepare_media.py']), null);
  assert.equal(resolveDemoFile('cigars-and-more', ['README']), null);
});

test('internal demos open at .../<slug>/index.html so relative assets and #anchors resolve', () => {
  assert.equal(internalDemoUrl('cigars-and-more'), '/app/demo-sites/cigars-and-more/index.html');
  const page = new URL(internalDemoUrl('cigars-and-more'), 'http://cc.local');
  assert.equal(new URL('styles.css', page).pathname, '/app/demo-sites/cigars-and-more/styles.css');
  assert.equal(new URL('#visit', page).pathname, page.pathname);
});
