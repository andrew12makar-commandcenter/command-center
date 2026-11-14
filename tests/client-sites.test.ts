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
  assert.equal(site.pinnedUrl, 'https://e47cf2ba.circle-tavern-official.pages.dev');
  assert.match(site.saleNote ?? '', /George/i);
  assert.match(site.saleNote ?? '', /\$1,000/);
  assert.equal(site.repo.host, 'gitlab');
  assert.equal(site.repo.name, 'circle-venu');
  assert.equal(repoUrl(site), 'https://gitlab.com/andrew-makar-personal-projects-group/circle-venu');
  assert.equal(sitesInCollection('build').map((s) => s.slug).join(','), 'circle-tavern');
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
  assert.equal(sitesInCollection('demo').map((s) => s.slug).join(','), 'johnnyds');
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
