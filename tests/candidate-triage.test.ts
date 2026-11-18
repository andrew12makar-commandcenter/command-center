import test from 'node:test';
import assert from 'node:assert/strict';
import { triageDiscoveryCandidate } from '../lib/candidate-triage.ts';

test('puts a likely local customer with an unrecorded site first for research, without qualifying it', () => {
  const result = triageDiscoveryCandidate({
    name: 'Ensueno Body & Skin Care', category: 'wellness service', phone: '617-555-0100',
  });
  assert.equal(result.band, 'review_first');
  assert.equal(result.fit, 'likely_target');
  assert.equal(result.siteEvidence, 'no_url_in_source');
  assert.match(result.reasons.join(' '), /check first-party/);
});

test('keeps third-party links separate from the first review band', () => {
  const result = triageDiscoveryCandidate({
    name: 'Brighton Bakery', category: 'bakery', thirdPartyUrls: ['https://example.test/order'],
  });
  assert.equal(result.band, 'research_later');
  assert.equal(result.siteEvidence, 'third_party_only');
  assert.equal(result.hasContactPath, false);
});

test('keeps a no-site candidate without a usable contact path in the later research band', () => {
  const result = triageDiscoveryCandidate({ name: 'Brighton Bakery', category: 'bakery' });
  assert.equal(result.band, 'research_later');
  assert.equal(result.siteEvidence, 'no_url_in_source');
  assert.equal(result.hasContactPath, false);
});

test('holds a candidate with no map category for an identity check before first-priority research', () => {
  const result = triageDiscoveryCandidate({
    name: 'Academy Hill Plumbing', phone: '617-206-2620',
  });
  assert.equal(result.band, 'research_later');
  assert.equal(result.fit, 'likely_target');
  assert.ok(result.reasons.some((reason) => reason.includes('No business category is recorded')));
});

test('lowers shared-office practitioners and chains without auto-disqualifying them', () => {
  const result = triageDiscoveryCandidate({
    name: 'Local Dental Group', category: 'dental clinic', flags: ['institutional_address_20_listings'],
  });
  assert.equal(result.band, 'lower_priority');
  assert.equal(result.fit, 'likely_target');
  assert.ok(result.reasons.some((reason) => reason.includes('shared-office clue')));
});

test('does not call an existing website a gap', () => {
  const result = triageDiscoveryCandidate({
    name: 'Brighton Cafe', category: 'restaurant', website: 'https://example.test',
  });
  assert.equal(result.band, 'research_later');
  assert.equal(result.siteEvidence, 'website_recorded');
});
