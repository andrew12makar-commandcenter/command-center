import { parseCsv } from './csv.ts';

// Review-only intake for a sanitized public business list (for example a
// municipal food-license / licensing-board export). The file is discovery
// input: it never proves a business is open, never qualifies a prospect and
// never creates CRM records. Rows are grouped so repeated license rows for one
// business become one candidate, while different businesses that share an
// address stay separate.

export const PUBLIC_LIST_HEADERS = ['business_name', 'address', 'category', 'source'] as const;
export const PUBLIC_LIST_MAX_ROWS = 1000;

export type PublicListRow = { rowNumber: number; businessName: string; address: string; category: string; source: string };
export type ParsedAddress = { number: number | null; numberEnd: number | null; street: string | null; city: string | null; postcode: string | null };
export type KnownBusiness = { name: string; address?: string | null; kind: 'roster' | 'ledger' | 'staged' | 'crm' };
export type CandidateStatus = 'new' | 'in_roster' | 'in_ledger' | 'already_staged' | 'in_crm' | 'out_of_scope';
export type PublicListCandidate = {
  key: string;
  name: string;
  aliases: string[];
  address: string;
  addressVariants: string[];
  street: string | null;
  postcode: string | null;
  city: string | null;
  categories: string[];
  sources: string[];
  rows: PublicListRow[];
  status: CandidateStatus;
  statusReason: string;
  matchedName: string | null;
  // No coordinates are supplied by this file, so location stays unresolved until reviewed.
  locationStatus: 'unresolved';
  flags: string[];
};
export type PublicListPreview = {
  rowCount: number;
  candidates: PublicListCandidate[];
  duplicateRows: number;
  counts: Record<CandidateStatus, number>;
  sameNameOtherAddress: number;
};

const LEGAL_TOKENS = new Set(['inc', 'llc', 'co', 'corp', 'corporation', 'company', 'the', 'and', 'of']);
const GENERIC_TOKENS = new Set(['restaurant', 'rest', 'cafe', 'brighton', 'boston', 'allston']);
const STREET_SUFFIX = /\b(st|street|av|ave|avenue|rd|road|pkwy|parkway|pl|place|sq|square|ter|terrace|ct|court|dr|drive|way|ln|lane|blvd)\.?$/;

function fold(value: string) {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'").toLowerCase();
}

export function businessTokens(name: string): string[] {
  const folded = fold(name).replace(/&/g, ' and ').replace(/\([^)]*\)/g, ' ');
  const tokens = folded.split(/[^a-z0-9']+/).map((token) => token.replace(/'/g, '')).filter((token) => token && !/^\d+$/.test(token));
  const named = tokens.filter((token) => !LEGAL_TOKENS.has(token));
  const distinctive = named.filter((token) => !GENERIC_TOKENS.has(token));
  // Keep a usable key even when every token is generic (for example "The Brighton Cafe").
  return distinctive.length ? distinctive : named.length ? named : tokens;
}

export function businessKey(name: string): string {
  return businessTokens(name).join('');
}

export function parseAddress(value: string): ParsedAddress {
  const parts = fold(value).split(',').map((part) => part.trim()).filter(Boolean);
  const postcode = fold(value).match(/\b(\d{5})(?:-\d{4})?\b(?!.*\b\d{5}\b)/)?.[1] ?? null;
  const first = parts[0] ?? '';
  const match = first.match(/^(\d+)[a-z]?(?:\s*-\s*(?:(\d+)[a-z]?)?)?\s+(.+)$/);
  let street: string | null = null, number: number | null = null, numberEnd: number | null = null;
  if (match) {
    number = Number(match[1]);
    numberEnd = match[2] ? Number(match[2]) : null;
    if (numberEnd !== null && numberEnd < number) numberEnd = null;
    street = match[3];
  } else if (first && !/^\d/.test(first)) {
    street = first;
  }
  if (street) {
    street = street.replace(/#.*$/, '').replace(/\./g, '').trim().replace(STREET_SUFFIX, '').trim()
      .replace(/^(n|no|north)\s+/, 'north ').replace(/^(s|so|south)\s+/, 'south ')
      .replace(/^comm$/, 'commonwealth').replace(/\s+/g, ' ');
    if (!street) street = null;
  }
  const city = parts.slice(1).map((part) => part.replace(/\bma\b.*$/, '').replace(/\d{5}.*/, '').replace(/[^a-z ]/g, '').trim())
    .find((part) => part && part.length > 2) ?? null;
  return { number, numberEnd, street, city: city ? city.replace(/\b\w/g, (c) => c.toUpperCase()) : null, postcode };
}

// Municipal food licenses often drop the "N" from North Beacon Street.
const streetBase = (street: string | null) => street ? street.replace(/^north /, '') : null;

export function sameLocation(a: ParsedAddress, b: ParsedAddress, slack = 12): boolean {
  if (!a.street || !b.street || streetBase(a.street) !== streetBase(b.street)) return false;
  if (a.number === null || b.number === null) return true;
  const aEnd = a.numberEnd ?? a.number, bEnd = b.numberEnd ?? b.number;
  return a.number <= bEnd + slack && b.number <= aEnd + slack;
}

const keysMatch = (a: string, b: string) => Boolean(a && b) && (a === b || (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a))));

// Name agreement. Looser rules (reordered words, a shorter form of the same name,
// a variant spelling of the first word) apply only at the same street address.
export function namesMatch(a: string, b: string, sameAddress: boolean): boolean {
  if (keysMatch(businessKey(a), businessKey(b))) return true;
  const ta = businessTokens(a), tb = businessTokens(b);
  const setA = new Set(ta), setB = new Set(tb);
  if (setA.size && setA.size === setB.size && [...setA].every((t) => setB.has(t))) return true;
  if (!sameAddress) return false;
  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  if (small.size && [...small].every((t) => large.has(t)) && [...small].some((t) => t.length >= 4)) return true;
  const fa = ta[0] ?? '', fb = tb[0] ?? '';
  return Math.min(fa.length, fb.length) >= 4 && (fa.startsWith(fb) || fb.startsWith(fa));
}

const OUT_OF_SCOPE = /\b(dunkin|starbucks|subway|mcdonald'?s|chipotle|domino'?s|papa john'?s|taco bell|jersey mike'?s|tropical smoothie|ihop|international house of pancake|star market|marriott|hotel boston|boston college|trustees of|seminary|medical center|children'?s (?:cafe|hospital)|eurest|guckenheimer|nexdine|celtics|ice arena|senior comm|elks|new balance|shaloh house|ef international|kung fu tea|playa bowls|cafe landwer|craft food halls|chestnut park|waterstone|dining facility|motel)\b/i;

export function parsePublicBusinessList(csv: string): PublicListRow[] {
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error('The file is empty.');
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const expected = [...PUBLIC_LIST_HEADERS];
  if (header.length !== expected.length || expected.some((name) => !header.includes(name))) {
    throw new Error('Use exactly these headers: ' + expected.join(', ') + '.');
  }
  const body = rows.slice(1);
  if (!body.length) throw new Error('The file has a header but no rows.');
  if (body.length > PUBLIC_LIST_MAX_ROWS) throw new Error(`Use at most ${PUBLIC_LIST_MAX_ROWS} rows per file.`);
  const at = (row: string[], name: string) => String(row[header.indexOf(name)] ?? '').trim().slice(0, 300);
  return body.map((row, index) => ({
    rowNumber: index + 2,
    businessName: at(row, 'business_name'),
    address: at(row, 'address'),
    category: at(row, 'category'),
    source: at(row, 'source'),
  })).filter((row) => row.businessName || row.address);
}

function knownAddress(known: KnownBusiness): ParsedAddress | null {
  const text = known.address ?? (known.name.includes(' · ') ? known.name.split(' · ').slice(1).join(', ') : '');
  return text ? parseAddress(text) : null;
}

export function previewPublicBusinessList(rows: PublicListRow[], known: KnownBusiness[] = []): PublicListPreview {
  const groups: { key: string; parsed: ParsedAddress; rows: PublicListRow[] }[] = [];
  for (const row of rows) {
    const key = businessKey(row.businessName);
    const parsed = parseAddress(row.address);
    // Same business only when the names agree AND the locations agree; a shared address alone never merges.
    const group = groups.find((g) => sameLocation(g.parsed, parsed) && namesMatch(g.rows[0].businessName, row.businessName, sameLocation(g.parsed, parsed, 2)));
    if (group) {
      group.rows.push(row);
      if (key.length > group.key.length && group.key.length < 5) group.key = key;
      if (group.parsed.number === null && parsed.number !== null) group.parsed = parsed;
    } else {
      groups.push({ key, parsed, rows: [row] });
    }
  }
  const knownParsed = known.map((entry) => ({ entry, name: entry.name.split(' · ')[0], parsed: knownAddress(entry) }));
  const candidates = groups.map((group): PublicListCandidate => {
    const names = [...new Set(group.rows.map((row) => row.businessName).filter(Boolean))];
    const addresses = [...new Set(group.rows.map((row) => row.address).filter(Boolean))];
    const name = names.find((n) => /[a-z]/.test(n)) ?? names[0] ?? 'Unnamed record';
    const matches = knownParsed.filter((k) => {
      const located = Boolean(k.parsed?.street && group.parsed.street);
      if (located && !sameLocation(k.parsed!, group.parsed, 25)) return false;
      const sameAddress = located && sameLocation(k.parsed!, group.parsed, 2);
      return names.some((n) => namesMatch(k.name, n, sameAddress));
    });
    const order: KnownBusiness['kind'][] = ['roster', 'ledger', 'staged', 'crm'];
    const best = order.map((kind) => matches.find((m) => m.entry.kind === kind)).find(Boolean);
    let status: CandidateStatus = 'new', statusReason = 'Not in the roster, ledger, review queue or CRM. Review before counting.';
    if (best) {
      status = best.entry.kind === 'roster' ? 'in_roster' : best.entry.kind === 'ledger' ? 'in_ledger' : best.entry.kind === 'staged' ? 'already_staged' : 'in_crm';
      statusReason = `Matches ${best.entry.kind === 'crm' ? 'CRM record' : best.entry.kind === 'staged' ? 'review-queue row' : best.entry.kind + ' entry'} “${best.entry.name.split(' · ')[0]}”.`;
    } else if (OUT_OF_SCOPE.test(names.join(' '))) {
      status = 'out_of_scope';
      statusReason = 'Chain, institution or facility dining; outside the local-prospect scope.';
    } else if (group.rows.every((row) => /certified business/i.test(row.source)) && !group.parsed.street) {
      status = 'out_of_scope';
      statusReason = 'Directory record without a storefront street address.';
    }
    return {
      key: group.key,
      name,
      aliases: names.filter((n) => n !== name),
      address: addresses[0] ?? '',
      addressVariants: addresses.slice(1),
      street: group.parsed.street ? `${group.parsed.number ?? ''}${group.parsed.numberEnd ? '-' + group.parsed.numberEnd : ''} ${group.parsed.street}`.trim() : null,
      postcode: group.parsed.postcode,
      city: group.parsed.city,
      categories: [...new Set(group.rows.map((row) => row.category).filter(Boolean))],
      sources: [...new Set(group.rows.map((row) => row.source).filter(Boolean))],
      rows: group.rows,
      status,
      statusReason,
      matchedName: best ? best.entry.name.split(' · ')[0] : null,
      locationStatus: 'unresolved',
      flags: [],
    };
  });
  // Flag, never merge, identical names at different addresses.
  for (const candidate of candidates) {
    if (candidates.some((other) => other !== candidate && keysMatch(other.key, candidate.key))) candidate.flags.push('same_name_other_address');
  }
  const counts = { new: 0, in_roster: 0, in_ledger: 0, already_staged: 0, in_crm: 0, out_of_scope: 0 } as Record<CandidateStatus, number>;
  for (const candidate of candidates) counts[candidate.status]++;
  return {
    rowCount: rows.length,
    candidates,
    duplicateRows: rows.length - candidates.length,
    counts,
    sameNameOtherAddress: candidates.filter((c) => c.flags.includes('same_name_other_address')).length,
  };
}

export const candidateStatusLabels: Record<CandidateStatus, string> = {
  new: 'New for review',
  in_roster: 'Already in roster',
  in_ledger: 'Already screened (ledger)',
  already_staged: 'Already in review queue',
  in_crm: 'Already in CRM',
  out_of_scope: 'Out of scope',
};

// Official dataset pages for the City of Boston sources this file usually comes from.
const OFFICIAL_SOURCE_PAGES: Record<string, string> = {
  'active food establishment licenses': 'https://data.boston.gov/dataset/active-food-establishment-licenses',
  'licensing board licenses': 'https://data.boston.gov/dataset/licensing-board-licenses',
  'certified business directory': 'https://data.boston.gov/dataset/certified-business-directory',
};
export const publicSourceUrl = (source: string) => OFFICIAL_SOURCE_PAGES[source.trim().toLowerCase()] ?? null;

export type StagedPublicEntry = {
  name: string;
  city: string | null;
  category: string;
  source_url: string | null;
  source_type: 'public_business_list';
  raw_data: Record<string, unknown>;
};

// One review-queue row per new candidate, with every contributing source row kept.
export function stagedEntryFor(candidate: PublicListCandidate, fileName: string, importedAt: string): StagedPublicEntry {
  const sourceUrls = [...new Set(candidate.sources.map(publicSourceUrl).filter((url): url is string => Boolean(url)))];
  return {
    name: candidate.name.slice(0, 180),
    city: candidate.city,
    category: candidate.categories.join(' · ').slice(0, 180),
    source_url: sourceUrls[0] ?? null,
    source_type: 'public_business_list',
    raw_data: {
      business_name: candidate.name,
      address: candidate.address,
      street: candidate.street,
      postcode: candidate.postcode,
      location_status: 'unresolved',
      location_note: 'Address from a public list only; no reliable coordinates. Confirm the exact location on Maps before use.',
      public_list: {
        file_name: fileName.slice(0, 200),
        imported_at: importedAt,
        aliases: candidate.aliases,
        address_variants: candidate.addressVariants,
        categories: candidate.categories,
        sources: candidate.sources,
        source_urls: sourceUrls,
        flags: candidate.flags,
        rows: candidate.rows.map((row) => ({ row: row.rowNumber, business_name: row.businessName, address: row.address, category: row.category, source: row.source })),
      },
    },
  };
}
