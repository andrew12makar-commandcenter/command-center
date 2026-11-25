import { parseCsv } from './csv.ts';

// Businesses that were screened but not counted toward the two-need target.
// Every row keeps its discovery source, check date, decision and reason so a
// candidate is never silently counted or re-screened without context.
export const SCREENING_DECISIONS = ['held', 'excluded'] as const;
export type ScreeningDecision = typeof SCREENING_DECISIONS[number];

export const SCREENING_REASON_LABELS: Record<string, string> = {
  closed: 'Closed on Maps',
  stale_activity: 'No recent activity',
  stale_identity: 'Stale identity at address',
  identity_unresolved: 'Identity or location unresolved',
  not_found: 'No matching Maps listing',
  no_gap: 'No concrete website or Maps gap',
  no_second_need: 'No independent second need',
  duplicate: 'Possible duplicate operator',
  unverified: 'Could not be re-read',
  conflicting_evidence: 'Conflicting evidence',
};

export type ScreeningEntry = {
  business: string;
  address: string;
  discoverySource: string;
  checked: string;
  decision: ScreeningDecision;
  reasonCode: string;
  reasonLabel: string;
  reason: string;
  evidenceUrl: string | null;
};

const REQUIRED = ['business', 'address', 'discovery_source', 'checked', 'decision', 'reason_code', 'reason', 'evidence_url'];
const nameKey = (value: string) => value.toLowerCase().split(' · ')[0].replace(/[^a-z0-9]/g, '');

export function parseScreeningLedger(csv: string, rosterBusinesses: string[] = []): ScreeningEntry[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return [];
  const columns = header.map((cell) => cell.trim());
  const missing = REQUIRED.filter((name) => !columns.includes(name));
  if (missing.length) throw new Error('Screening ledger is missing columns: ' + missing.join(', '));
  const at = (row: string[], name: string) => (row[columns.indexOf(name)] ?? '').trim();
  const roster = new Set(rosterBusinesses.map(nameKey));
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const business = at(row, 'business');
    const decision = at(row, 'decision');
    const key = nameKey(business);
    // Skip blanks, unknown decisions, duplicates, and anything already shown in the roster.
    if (!business || !SCREENING_DECISIONS.includes(decision as ScreeningDecision) || seen.has(key) || roster.has(key)) return [];
    seen.add(key);
    const reasonCode = at(row, 'reason_code');
    const url = at(row, 'evidence_url');
    return [{
      business,
      address: at(row, 'address'),
      discoverySource: at(row, 'discovery_source'),
      checked: at(row, 'checked'),
      decision: decision as ScreeningDecision,
      reasonCode,
      reasonLabel: SCREENING_REASON_LABELS[reasonCode] ?? 'Other',
      reason: at(row, 'reason'),
      evidenceUrl: /^https?:\/\//.test(url) ? url : null,
    }];
  });
}

export function summarizeScreening(entries: ScreeningEntry[]) {
  const byReason = new Map<string, number>();
  for (const entry of entries) byReason.set(entry.reasonLabel, (byReason.get(entry.reasonLabel) ?? 0) + 1);
  return {
    total: entries.length,
    held: entries.filter((entry) => entry.decision === 'held').length,
    excluded: entries.filter((entry) => entry.decision === 'excluded').length,
    byReason: [...byReason.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  };
}
