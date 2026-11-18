import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseScreeningLedger, summarizeScreening } from '../lib/screening-ledger.ts';

const header = 'business,address,discovery_source,checked,decision,reason_code,reason,evidence_url\n';

test('keeps provenance, decision and reason for each screened business', () => {
  const [entry] = parseScreeningLedger(header + 'Sunday Bakery,418 Market St,Brighton Main Streets directory,2026-10-18,excluded,closed,"Maps marks it permanently closed, so exclude.",http://sundaybakeryma.com/\n');
  assert.equal(entry.decision, 'excluded');
  assert.equal(entry.reasonLabel, 'Closed on Maps');
  assert.equal(entry.discoverySource, 'Brighton Main Streets directory');
  assert.equal(entry.reason, 'Maps marks it permanently closed, so exclude.');
  assert.equal(entry.evidenceUrl, 'http://sundaybakeryma.com/');
});

test('drops duplicates, unknown decisions and businesses already in the roster', () => {
  const csv = header +
    'Cafe Mirror,362 Washington St,License,2026-10-18,held,no_second_need,x,\n' +
    'Zeta Shop,1 Main St,Directory,2026-10-18,held,no_gap,x,\n' +
    'Zeta Shop,1 Main St,Directory,2026-10-18,excluded,closed,x,\n' +
    'Omega Shop,2 Main St,Directory,2026-10-18,qualified,none,x,not-a-url\n';
  const entries = parseScreeningLedger(csv, ['Cafe Mirror · 362 Washington St, Brighton']);
  assert.deepEqual(entries.map((entry) => entry.business), ['Zeta Shop']);
  assert.equal(entries[0].evidenceUrl, null);
});

test('rejects a ledger without the required provenance columns', () => {
  assert.throws(() => parseScreeningLedger('business,decision\nA,held\n'), /missing columns/);
});

test('committed ledger parses and every row has a known reason and a check date', () => {
  const entries = parseScreeningLedger(readFileSync('docs/brighton-candidate-screening-ledger.csv', 'utf8'));
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    assert.notEqual(entry.reasonLabel, 'Other', entry.business);
    assert.match(entry.checked, /^\d{4}-\d{2}-\d{2}$/, entry.business);
  }
  const summary = summarizeScreening(entries);
  assert.equal(summary.held + summary.excluded, summary.total);
});
