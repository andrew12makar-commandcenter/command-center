import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraft, defaultPreferences} from '../lib/demo-engine.ts';
import {buildSiteBlueprint} from '../lib/site-blueprint.ts';
import {renderWiredSite} from '../components/site-design-document.ts';
import {INTERNAL_DISCLAIMER} from '../lib/design-system/policy.ts';

function brighton() {
  const draft = createDraft('Brighton Barbers', null, 'barber', 'universal', defaultPreferences());
  const site = buildSiteBlueprint('universal', draft, {name: 'Brighton Barbers', category: 'barber'});
  const html = renderWiredSite(site, {recorded: {address: '8 Chestnut Hill Ave'}});
  return {site, html};
}

test('renderSite document keeps the disclaimer, noindex, and self-hosted fonts', () => {
  const {site, html} = brighton();
  assert.equal(site.noindex, true);
  assert.match(site.internalDisclaimer, /Internal concept, not endorsed by the business/);
  assert.equal(site.content.factStatus === 'owner_approved', false);
  assert.match(html, /Internal concept, not endorsed by the business/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.match(html, /@font-face/);
  assert.match(html, /fraunces-9e509503\.woff2/);
  assert.match(html, /sourcesans3-e6c9ca63\.woff2/);
  assert.equal(html.includes('<script'), false);
  assert.equal(html.includes('owner_approved'), false);
});

test('Brighton Barbers renders only the confirmed name and street', () => {
  const {html} = brighton();
  assert.match(html, /Brighton Barbers/);
  assert.match(html, /8 Chestnut Hill Ave/);
  assert.match(html, /to confirm/);
  assert.equal(html.includes('617'), false);
  assert.equal(/booksy/i.test(html), false);
  assert.equal(html.includes('$'), false);
  assert.equal(/Request information/i.test(html), false);
  assert.equal(/Expertise organized/i.test(html), false);
  assert.equal(/Discover/.test(html), false);
  assert.equal(/Move forward/.test(html), false);
  assert.match(html, /data-mark="monogram"/);
  assert.match(html, />BB</);
  assert.match(html, /<address class="ds-plain">8 Chestnut Hill Ave<\/address>/);
});

test('boilerplate generator lines are not copied into the document', () => {
  const draft = createDraft('Example Data Barbers', 'Example City', 'barber', 'universal', defaultPreferences());
  draft.services = ['Example data haircut', 'Example data shave'];
  if (!draft.siteContent) throw new Error('draft is missing site content');
  draft.siteContent.about = 'A sourced example about statement with no template phrase.';
  draft.siteContent.factStatus = 'unreviewed';
  const site = buildSiteBlueprint('universal', draft, {
    name: 'Example Data Barbers', city: 'Example City', phone: '555-0100', email: 'example-data@example.org', category: 'barber',
  });
  const html = renderWiredSite(site, {recorded: {address: '1 Example Data Street, Example City', hours: 'Example data hours — not a real schedule'}});
  assert.equal(/Request information/i.test(html), false);
  assert.equal(/SERVING EXAMPLE CITY/.test(html), false);
  assert.equal(/Contact the business directly/i.test(html), false);
  assert.equal(/What this business offers/i.test(html), false);
  assert.match(html, /Example data haircut/);
  assert.match(html, /to confirm/);
  assert.match(html, /data-composition=/);
  assert.equal(html.includes('owner_approved'), false);
});

test('a blocked skill pack cannot restyle the page or set approval', () => {
  const {site} = brighton();
  const blocked = renderWiredSite({
    ...site,
    skillPacks: {
      ids: ['example-night-venue'],
      example: true,
      disclaimer: INTERNAL_DISCLAIMER,
      robots: 'noindex, nofollow',
      tokens: {color: {accent: '#d4af6a'}, font: {display: 'Big Shoulders Display', body: 'Public Sans'}, radius: {panel: '14px'}, space: {}},
      sections: [],
      motion: [],
      layouts: [],
      copy: [],
      checks: [],
      checkResults: [{id: 'disclaimer', pass: false, severity: 'block', detail: 'failed'}],
    },
  }, {recorded: {address: '8 Chestnut Hill Ave'}});
  assert.equal(blocked.includes('#d4af6a'), false);
  assert.equal(blocked.includes('owner_approved'), false);
  assert.match(blocked, /Internal concept, not endorsed by the business/);
});
