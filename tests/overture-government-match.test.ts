import test from 'node:test';
import assert from 'node:assert/strict';
import { matchGovernmentEvidence, needsFoodPermitStatusCheck } from '../lib/overture-government-match.ts';
import type { GovernmentCandidate } from '../lib/government-discovery.ts';

function record(name: string, address: string, id = name): GovernmentCandidate {
  return {
    source_id: 'active-food-establishment-licenses', source_title: 'Active Food Establishment Licenses',
    source_url: 'https://data.boston.gov/dataset/active-food-establishment-licenses', download_url: 'https://data.boston.gov/example.csv',
    downloaded_at: '2026-10-15T09:00:00.000Z', candidate_id: id, source_row_index: 1, record_id: id,
    name, legal_name: null, category: 'Food establishment', address, city: 'Brighton', zip: '02135', website: null,
    license_status: 'Active', license_type: 'Food', issued_on: null, expires_on: null,
    coordinates: null, distance_miles: null, location_status: 'needs_location_match', possible_duplicate_ids: [],
  };
}

test('matches normalized name and street address while tolerating city address formatting', () => {
  const result = matchGovernmentEvidence({ name: 'Cafe Mirror', street: '362 Washington St' }, [
    record('CAFE MIRROR', '362 Washington', 'mirror'),
    record('Other Cafe', '362 Washington St', 'other'),
  ]);
  assert.deepEqual(result.exactMatches.map((x) => x.candidate_id), ['mirror']);
  assert.deepEqual(result.possibleNameVariants, []);
  assert.deepEqual(result.otherNamesAtAddress.map((x) => x.candidate_id), ['other']);
});

test('surfaces a distinctive shortened name as a review clue, not an exact identity match', () => {
  const result = matchGovernmentEvidence({ name: 'Nakhon Southern Thai', street: '296 Washington St' }, [
    record('NAKHON', '296 Washington', 'short-name'),
  ]);
  assert.equal(result.exactMatches.length, 0);
  assert.equal(result.possibleNameVariants[0]?.name, 'NAKHON');
  assert.equal(result.otherNamesAtAddress.length, 0);
});

test('supports a building number inside a city-record range and unit suffixes', () => {
  const result = matchGovernmentEvidence({ name: 'Example Shop', street: '298 Washington St Unit 2' }, [
    record('Example Shop', '290-298 Washington ST', 'range'),
  ]);
  assert.equal(result.exactMatches.length, 1);
});

test('normalizes Boston city street addresses that put a dash after the number', () => {
  const result = matchGovernmentEvidence({ name: 'Cafenation', street: '380 Washington St' }, [
    record('CAFENATION', '380- Washington ST', 'trailing-dash'),
  ]);
  assert.equal(result.exactMatches.length, 1);
});

test('does not join a different business name just because the address matches', () => {
  const result = matchGovernmentEvidence({ name: 'Hoshi Ya Sushi', street: '529 Washington St' }, [
    record('Fuji Sky, Inc', '529 Washington ST', 'different-operator'),
  ]);
  assert.equal(result.exactMatches.length, 0);
  assert.equal(result.otherNamesAtAddress[0]?.name, 'Fuji Sky, Inc');
});

test('keeps unmatched candidates unknown rather than treating them as unlicensed', () => {
  const result = matchGovernmentEvidence({ name: 'No Match', street: '1 Example Rd' }, [
    record('Other Business', '2 Example Rd'),
  ]);
  assert.equal(result.exactMatches.length, 0);
  assert.equal(result.otherNamesAtAddress.length, 0);
});

test('flags a food candidate for current-status research only when no active food permit matched', () => {
  const candidate = { name: 'Former Restaurant', street: '433 Washington St', category: 'restaurant' };
  const missing = matchGovernmentEvidence(candidate, []);
  assert.equal(needsFoodPermitStatusCheck(candidate, missing), true);

  const active = matchGovernmentEvidence(candidate, [
    { ...record('Former Restaurant', '433 Washington St', 'food-license'), source_id: 'active-food-establishment-licenses' },
  ]);
  assert.equal(needsFoodPermitStatusCheck(candidate, active), false);
  assert.equal(needsFoodPermitStatusCheck({ ...candidate, category: 'financial service' }, missing), false);
});
