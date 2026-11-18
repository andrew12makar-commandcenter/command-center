import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_SITES, branchUrl, getClientSite, isOpenState, openItems, parseStatusMarkdown, repoUrl, sitesInCollection } from '../lib/client-sites.ts';

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

test('Oliveira Deli Market r1 is Client Demo 05 on GitLab with a Pages preview', () => {
  const matches = CLIENT_SITES.filter((s) => /oliveira/i.test(s.slug) || /oliveira/i.test(s.name));
  assert.equal(matches.length, 1);
  const site = getClientSite('oliveira-deli');
  assert.ok(site);
  assert.equal(site.collection, 'demo');
  assert.equal(site.stage, 'In review');
  assert.equal(site.repo.host, 'gitlab');
  assert.equal(site.repo.name, 'oliveira-deli-site');
  assert.equal(site.repo.defaultBranch, 'r1');
  assert.match(site.hosting, /oliveira-deli-preview/);
  assert.match(site.hosting, /no production deployment/);
  assert.equal(site.liveUrl, 'https://r1.oliveira-deli-preview.pages.dev');
  assert.equal(site.pinnedUrl, undefined);
  assert.equal(site.branches[0]?.previewUrl, 'https://r1.oliveira-deli-preview.pages.dev');
  assert.equal(branchUrl(site, 'r1'), 'https://gitlab.com/andrew-makar-personal-projects-group/oliveira-deli-site/-/tree/r1');
  assert.equal(site.branches[0]?.commitSha, 'a9a43b07334354c344a2e58b7d78f7cfc717516a');
  assert.equal(site.branches[0]?.commitUrl, 'https://gitlab.com/andrew-makar-personal-projects-group/oliveira-deli-site/-/commit/a9a43b07334354c344a2e58b7d78f7cfc717516a');
  assert.match(site.summary, /provisional/);
  assert.match(site.summary, /a9a43b07/);
  assert.match(site.summary, /Order on DoorDash/);
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
  assert.deepEqual(CLIENT_SITES.filter((s) => s.thumbnail).map((s) => s.slug), ['zisis-convenience', 'brighton-cellar-gourmet', 'kikis-kwikmart']);
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
  assert.equal(site.pinnedUrl, 'https://e1ee565f.brighton-cellar-gourmet-preview.pages.dev');
  assert.match(site.hosting, /Cloudflare Pages.*brighton-cellar-gourmet-preview/);
  assert.equal(repoUrl(site), 'https://gitlab.com/andrew-makar-personal-projects-group/brighton-cellar-gourmet');
  assert.equal(branchUrl(site, 'r1'), 'https://gitlab.com/andrew-makar-personal-projects-group/brighton-cellar-gourmet/-/tree/r1');
  const r1 = site.branches[0];
  assert.deepEqual(site.branches.map((b) => b.name), ['r1']);
  assert.equal(r1?.previewUrl, site.liveUrl);
  assert.equal(r1?.commitSha, '018903f58988fb7ec30236661201129ff87767a3');
  assert.equal(r1?.commitUrl, `https://gitlab.com/andrew-makar-personal-projects-group/brighton-cellar-gourmet/-/commit/${r1?.commitSha}`);
  assert.equal(site.thumbnail?.src, '/client-sites/brighton-cellar-gourmet.jpg');
  // demo numbers stay unique: 04 Zisis, 05 Oliveira, 06 Brighton
  for (const n of ['04', '05', '06']) assert.equal(CLIENT_SITES.filter((s) => s.summary.includes(`Client Demo ${n}`)).length, 1, `Client Demo ${n}`);
});

test('Client Demos lists Universal Barber Shop r4, Johnny D\'s r8, Zisis r1, Oliveira r1, Brighton Cellar r1, Kiki\'s r1 and Circle Tavern (sold, also shown as a demo)', () => {
  assert.equal(sitesInCollection('demo').map((s) => s.slug).join(','), 'johnnyds,universal-barber,zisis-convenience,oliveira-deli,brighton-cellar-gourmet,kikis-kwikmart,cigars-and-more,circle-tavern');
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

test('Cigars & More r1 is Client Demo 08 on GitLab, not yet deployed', () => {
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
  assert.equal(site.thumbnail, undefined);
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
