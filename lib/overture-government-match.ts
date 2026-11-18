import type { GovernmentCandidate } from './government-discovery.ts';

export type MapBusiness = { name: string; street: string | null; category?: string | null };

export type GovernmentEvidence = {
  exactMatches: GovernmentCandidate[];
  possibleNameVariants: GovernmentCandidate[];
  otherNamesAtAddress: GovernmentCandidate[];
};

function clean(value: unknown): string {
  return String(value ?? '').normalize('NFKD').toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function normalizedName(value: unknown): string {
  return clean(value).replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|company|co)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const GENERIC_NAME_WORDS = new Set(['the','and','of','at','in','for','by','restaurant','cafe','coffee','shop','store','food','service','services','company','co','inc','incorporated','llc','ltd','limited','corp','corporation']);
function likelyNameVariant(a: unknown, b: unknown): boolean {
  const left = normalizedName(a).split(' ').filter((word) => word && !GENERIC_NAME_WORDS.has(word));
  const right = normalizedName(b).split(' ').filter((word) => word && !GENERIC_NAME_WORDS.has(word));
  if (!left.length || !right.length) return false;
  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  // A distinctive name is a useful review clue; short words such as "cafe" or "bar"
  // are deliberately excluded. This never establishes identity by itself.
  return shorter.every((word) => longer.includes(word)) && shorter.some((word) => word.length >= 6);
}

function addressKeys(value: unknown): Set<string> {
  let address = String(value ?? '').normalize('NFKD').toLocaleLowerCase('en-US')
    .replace(/\b(?:suite|ste|unit|floor|fl|apt|apartment|#)\b.*$/, '')
    .replace(/[^a-z0-9\-/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  address = address.replace(/^(\d+)-\s+/, '$1 ');
  address = address.replace(/^(\d+)\s+([a-z])\s+/, '$1$2 ');
  const match = address.match(/^(\d+)(?:\s*[-/]\s*(\d+))?\s+(.+)$/);
  if (!match) return new Set();
  const road = match[3].replace(/\b(street|st|avenue|ave|av|road|rd|boulevard|blvd|drive|dr|lane|ln|place|pl|court|ct|circle|cir|highway|hwy|parkway|pkwy)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const numbers = [match[1], match[2]].filter(Boolean);
  return new Set(numbers.map((number) => `${number}|${road}`));
}

export function matchGovernmentEvidence(
  business: MapBusiness,
  records: GovernmentCandidate[],
): GovernmentEvidence {
  const name = normalizedName(business.name);
  const keys = addressKeys(business.street);
  const atAddress = records.filter((record) => {
    const recordKeys = addressKeys(record.address);
    return [...keys].some((key) => recordKeys.has(key));
  });
  const exactMatches = atAddress.filter((record) =>
    [record.name, record.legal_name].some((candidateName) => normalizedName(candidateName) === name),
  );
  const exactIds = new Set(exactMatches.map((record) => record.candidate_id));
  const possibleNameVariants = atAddress.filter((record) =>
    !exactIds.has(record.candidate_id) &&
    [record.name, record.legal_name].some((candidateName) => likelyNameVariant(candidateName, business.name)),
  );
  const variantIds = new Set(possibleNameVariants.map((record) => record.candidate_id));
  const otherNamesAtAddress = atAddress.filter((record) =>
    !exactIds.has(record.candidate_id) && !variantIds.has(record.candidate_id),
  );
  return { exactMatches, possibleNameVariants, otherNamesAtAddress };
}

export function needsFoodPermitStatusCheck(business: MapBusiness, evidence: GovernmentEvidence): boolean {
  const foodBusiness = /restaurant|eatery|cafe|coffee shop|bakery|food|deli|grocery|market|pub|bar|brewery|pizza|smoothie|tea shop|ice cream/i
    .test(business.category ?? '');
  return foodBusiness && !evidence.exactMatches.some((record) => record.source_id === 'active-food-establishment-licenses');
}
