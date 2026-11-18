import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAddress, parsePublicBusinessList, previewPublicBusinessList, stagedEntryFor, namesMatch } from '../lib/public-business-import.ts';

const header = 'business_name,address,category,source\n';
const csv = (lines: string[]) => header + lines.join('\n') + '\n';

test('requires exactly the four public-list headers', () => {
  assert.throws(() => parsePublicBusinessList('business_name,address,category\nA,1 Main St,FS\n'), /exactly these headers/);
  assert.throws(() => parsePublicBusinessList('business_name,address,category,source,phone\nA,1 Main St,FS,x,617\n'), /exactly these headers/);
  assert.throws(() => parsePublicBusinessList(header), /no rows/);
  assert.equal(parsePublicBusinessList('Source,Category,Address,Business_Name\nx,FS,"1 Main St, Brighton, 02135",A\n')[0].businessName, 'A');
});

test('parses license-style addresses, ranges and North Beacon variants', () => {
  assert.deepEqual(parseAddress('380- Washington ST, Brighton, 02135'), { number: 380, numberEnd: null, street: 'washington', city: 'Brighton', postcode: '02135' });
  assert.equal(parseAddress('366-370 Washington ST, Brighton, 02135').numberEnd, 370);
  assert.equal(parseAddress('547A- Washington ST, Brighton, 02135').number, 547);
  assert.equal(parseAddress('200- N Beacon ST, Brighton, 02135').street, 'north beacon');
  assert.equal(parseAddress('1914 Beacon Street, #3, Boston, MA 02135, Boston, 02135').street, 'beacon');
});

test('combines repeated license rows and aliases for one business', () => {
  const preview = previewPublicBusinessList(parsePublicBusinessList(csv([
    'CAFENATION,"380- Washington ST, Brighton, 02135",Common Victualler,Licensing Board Licenses',
    'CAFENATION,"378 Washington, Brighton, 02135",FS,Active Food Establishment Licenses',
    "JIM'S DELI & RESTAURANT,\"371- Washington ST, Brighton, 02135\",Common Victualler,Licensing Board Licenses",
    "Jim's Restaurant and Deli,\"371 Washington, Brighton, 02135\",FT,Active Food Establishment Licenses",
    'Tin Tin Buffet,"200 Beacon, Brighton, 02135",FT,Active Food Establishment Licenses',
    'TIN TIN BUFFET,"200- N Beacon ST, Brighton, 02135",Common Victualler,Licensing Board Licenses',
  ])));
  assert.equal(preview.candidates.length, 3);
  assert.equal(preview.duplicateRows, 3);
  const cafe = preview.candidates.find((c) => c.name === 'CAFENATION')!;
  assert.deepEqual(cafe.sources.sort(), ['Active Food Establishment Licenses', 'Licensing Board Licenses']);
  assert.equal(cafe.rows.length, 2);
});

test('never merges different businesses that share an address', () => {
  const preview = previewPublicBusinessList(parsePublicBusinessList(csv([
    'Dos Manos Kitchen,"525 Western, Brighton, 02135",FT,Active Food Establishment Licenses',
    'Linger,"525 Western, Brighton, 02135",FS,Active Food Establishment Licenses',
    'Pizza Project,"525 Western, Brighton, 02135",FT,Active Food Establishment Licenses',
    'DOLCE VITA (1696 Comm. Ave.),"1696 Commonwealth, Brighton, 02135",FT,Active Food Establishment Licenses',
    'Land of Fire Pizzeria,"1696 Commonwealth, Brighton, 02135",FT,Active Food Establishment Licenses',
  ])));
  assert.equal(preview.candidates.length, 5);
});

test('flags, but does not merge, the same name at a different address', () => {
  const preview = previewPublicBusinessList(parsePublicBusinessList(csv([
    'Brighton Sushi and Fry,"1581 Commonwealth, Brighton, 02135",FT,Active Food Establishment Licenses',
    'Brighton Sushi and Fry,"67- Washington ST, Brighton, 02135",Common Victualler,Licensing Board Licenses',
  ])));
  assert.equal(preview.candidates.length, 2);
  assert.ok(preview.candidates.every((c) => c.flags.includes('same_name_other_address')));
});

test('matches roster, ledger, queue and CRM records and marks out-of-scope chains', () => {
  const preview = previewPublicBusinessList(parsePublicBusinessList(csv([
    'Hippo Kitchen,"241 Market, Brighton, 02135",FT,Active Food Establishment Licenses',
    'BRIGHTON CAFE,"1597 COMMONWEALTH, BRIGHTON, 02135",FT,Active Food Establishment Licenses',
    'Sunday Bakery,"418 Market, Brighton, 02135",FT,Active Food Establishment Licenses',
    'Xin Chao Cafe,"418 Market, Brighton, 02135",FT,Active Food Establishment Licenses',
    'Gyro City,"167 Chestnut Hill, Brighton, 02135",FS,Active Food Establishment Licenses',
    'Fins Sushi & Grill,"354 Chestnut Hill, Brighton, 02135",FT,Active Food Establishment Licenses',
    'Dunkin Donuts,"344 Washington, Brighton, 02135",FT,Active Food Establishment Licenses',
  ])), [
    { name: 'Hippopo Kitchen · 241 Market St, Brighton', kind: 'roster' },
    { name: 'The Brighton Cafe · 1597 Commonwealth Ave, Brighton', kind: 'roster' },
    { name: 'Sunday Bakery', address: '418 Market St', kind: 'ledger' },
    { name: 'Gyro City', address: '167 Chestnut Hill Ave', kind: 'staged' },
    { name: 'Fins Sushi and Grill', address: '354 Chestnut Hill Ave', kind: 'crm' },
  ]);
  const status = Object.fromEntries(preview.candidates.map((c) => [c.name, c.status]));
  assert.equal(status['Hippo Kitchen'], 'in_roster');
  assert.equal(status['BRIGHTON CAFE'], 'in_roster');
  assert.equal(status['Sunday Bakery'], 'in_ledger');
  assert.equal(status['Xin Chao Cafe'], 'new', 'a different business at a ledger address stays new');
  assert.equal(status['Gyro City'], 'already_staged');
  assert.equal(status['Fins Sushi & Grill'], 'in_crm');
  assert.equal(status['Dunkin Donuts'], 'out_of_scope');
});

test('loose name rules apply only at the same address', () => {
  assert.equal(namesMatch('Hippo Kitchen', 'Hippopo Kitchen', true), true);
  assert.equal(namesMatch('Hippo Kitchen', 'Hippopo Kitchen', false), false);
  assert.equal(namesMatch('Brighton Gourmet and Cellar', 'Brighton Cellar and Gourmet', false), true);
  assert.equal(namesMatch('Gyro City', 'Gyro Theory', true), true, 'shared first word at one address is flagged as the same place for review');
  assert.equal(namesMatch('Gyro City', 'Gyro Theory', false), false);
});

test('staged entries keep provenance, stay review-only and leave location unresolved', () => {
  const [candidate] = previewPublicBusinessList(parsePublicBusinessList(csv([
    'Thonglor,"559 Washington, Brighton, 02135",FS,Active Food Establishment Licenses',
    'Thonglor,"559- Washington ST, Brighton, 02135",Common Victualler,Licensing Board Licenses',
  ]))).candidates;
  const entry = stagedEntryFor(candidate, 'export.csv', '2026-10-18T00:00:00.000Z');
  assert.equal(entry.source_type, 'public_business_list');
  assert.equal(entry.source_url, 'https://data.boston.gov/dataset/active-food-establishment-licenses');
  assert.equal(entry.raw_data.location_status, 'unresolved');
  assert.equal('distance_miles' in entry.raw_data, false);
  const list = entry.raw_data.public_list as { rows: { row: number }[]; source_urls: string[] };
  assert.deepEqual(list.rows.map((row) => row.row), [2, 3]);
  assert.equal(list.source_urls.length, 2);
  assert.equal('qualified' in entry, false);
  assert.equal('triage_status' in entry, false);
});
