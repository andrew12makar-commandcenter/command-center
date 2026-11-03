import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_SITES, branchUrl, getClientSite, isOpenState, openItems, parseStatusMarkdown } from '../lib/client-sites.ts';

const SAMPLE = `# Status: 2 Nov 2026

| Area | State | Evidence |
|---|---|---|
| Intro | Working | d1 |
| Gyro restaurant | Placeholder: labelled layout preview | d4 |
| GitHub repo / branch previews | **NOT DONE**. No repo yet. | \`docs/SESSION_HANDOFF.md\` |

## 3 Nov: layers
| Layer | What | Test |
|---|---|---|
| gyro-facts | Name and sections | PASS |
| gyro-opening | Opening pan | Inert: file not received |
`;

test('registry slugs are unique and every site has https links and owned branches', () => {
  const slugs = CLIENT_SITES.map((s) => s.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const site of CLIENT_SITES) {
    assert.match(site.liveUrl, /^https:\/\//);
    for (const b of site.branches) {
      assert.ok(b.owner.length > 0, `${site.slug}:${b.name} needs an owner`);
      if (b.previewUrl) assert.match(b.previewUrl, /^https:\/\//);
    }
  }
});

test('Circle Tavern branch owners match the agreed split', () => {
  const site = getClientSite('circle-tavern');
  assert.ok(site);
  const owners = Object.fromEntries(site.branches.map((b) => [b.name, b.owner]));
  assert.equal(owners['room/bar'], 'Andrew');
  assert.equal(owners['room/kitchen'], 'Andrew');
  assert.equal(owners['room/speakeasy'], 'Ryan');
  assert.equal(owners['fx/transitions'], 'Ryan');
  assert.match(owners.main, /shared/i);
  assert.equal(branchUrl(site, 'room/bar'), 'https://github.com/andrew12makar-commandcenter/venu/tree/room/bar');
});

test('status markdown parses into sections and flags open items', () => {
  const { title, sections } = parseStatusMarkdown(SAMPLE);
  assert.equal(title, 'Status: 2 Nov 2026');
  assert.equal(sections.length, 2);
  assert.deepEqual(sections[0].columns, ['Area', 'State', 'Evidence']);
  assert.equal(sections[0].rows[2].cells[1], 'NOT DONE. No repo yet.');
  assert.equal(sections[0].rows[2].cells[2], 'docs/SESSION_HANDOFF.md');
  assert.deepEqual(openItems(sections).map((o) => o.item), ['Gyro restaurant', 'GitHub repo / branch previews', 'gyro-opening']);
});

test('open-state detection', () => {
  assert.equal(isOpenState('Working'), false);
  assert.equal(isOpenState('Demo mode only: nothing is sent'), true);
  assert.equal(isOpenState('PASS'), false);
});
