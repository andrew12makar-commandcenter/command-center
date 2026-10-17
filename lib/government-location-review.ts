import { normalizeBusiness } from './csv.ts';
import type { GovernmentCandidate } from './government-discovery.ts';

export type PresenceReviewStatus = 'researching' | 'covered';
export type GovernmentLocationReview = {
  key: string;
  status: PresenceReviewStatus;
  business_name: string;
  address: string;
  zip: string;
  google_profile_url: string;
  website_url: string;
  seo_evidence_url: string;
  evidence_note: string;
  website_strong: boolean;
  maps_profile_confirmed: boolean;
  seo_strong: boolean;
  reviewed_at: string;
};

const clean = (value: unknown, limit = 500) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
const zip5 = (value: unknown) => clean(value, 12).replace(/\D/g, '').slice(0, 5);

/** Stable only for the same business name, full source address, and ZIP. Never match on address alone. */
export function governmentLocationKey(name: unknown, address: unknown, zip: unknown): string | null {
  const business = normalizeBusiness(clean(name, 180));
  const street = normalizeBusiness(clean(address, 200));
  const postal = zip5(zip);
  if (business.length < 3 || street.length < 5 || !/^\d{5}$/.test(postal)) return null;
  return `${business}|${street}|${postal}`;
}

function isSafePublicUrl(value: unknown, allowedHosts?: string[]): boolean {
  try {
    const url = new URL(clean(value, 1024));
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    if (allowedHosts && !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return false;
    return true;
  } catch { return false; }
}

function isGooglePlaceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.hostname === 'maps.app.goo.gl' || url.hostname.endsWith('.maps.app.goo.gl')) return true;
    return (url.hostname === 'google.com' || url.hostname.endsWith('.google.com')) &&
      (url.pathname.startsWith('/maps/place/') || (url.pathname === '/maps' && url.searchParams.has('cid')));
  } catch { return false; }
}

export function validateGovernmentLocationReview(input: {
  name: unknown; address: unknown; zip: unknown;
  googleProfileUrl: unknown; websiteUrl: unknown; seoEvidenceUrl: unknown; evidenceNote: unknown;
  websiteStrong: boolean; mapsProfileConfirmed: boolean; seoStrong: boolean;
}, status: PresenceReviewStatus, now = new Date().toISOString()): { review: GovernmentLocationReview | null; error: string | null } {
  const name = clean(input.name, 180), address = clean(input.address, 200), zip = clean(input.zip, 12);
  const key = governmentLocationKey(name, address, zip);
  if (!key) return { review: null, error: 'This source row needs a full business name, street address, and five-digit ZIP before it can be tracked.' };
  const googleProfileUrl = clean(input.googleProfileUrl, 1024);
  const websiteUrl = clean(input.websiteUrl, 1024);
  const seoEvidenceUrl = clean(input.seoEvidenceUrl, 1024);
  const evidenceNote = clean(input.evidenceNote, 500);
  if (status === 'covered') {
    if (!input.mapsProfileConfirmed || !input.websiteStrong || !input.seoStrong || !evidenceNote)
      return { review: null, error: 'To mark this location covered, confirm its exact Google profile and strong website and SEO evidence, then add a short note.' };
    if (!isSafePublicUrl(googleProfileUrl, ['google.com', 'maps.app.goo.gl']) || !isGooglePlaceUrl(googleProfileUrl))
      return { review: null, error: 'Add the exact public Google Maps profile link (https://). A search-results page is not enough.' };
    if (!isSafePublicUrl(websiteUrl)) return { review: null, error: 'Add the working first-party website URL (https://) you reviewed.' };
    if (!isSafePublicUrl(seoEvidenceUrl)) return { review: null, error: 'Add a public source URL supporting the SEO check (https://).' };
  }
  return { review: {
    key, status, business_name: name, address, zip,
    google_profile_url: googleProfileUrl, website_url: websiteUrl, seo_evidence_url: seoEvidenceUrl,
    evidence_note: evidenceNote, website_strong: Boolean(input.websiteStrong),
    maps_profile_confirmed: Boolean(input.mapsProfileConfirmed), seo_strong: Boolean(input.seoStrong), reviewed_at: now,
  }, error: null };
}

/** Suppress only an exact displayed-business name and location, with suite-aware matching. */
export function isSameGovernmentLocation(input: { name: string; address: string; zip: string }, review: GovernmentLocationReview): boolean {
  if (normalizeBusiness(input.name) !== normalizeBusiness(review.business_name)) return false;
  if (zip5(input.zip) !== zip5(review.zip)) return false;
  const unit = (value: string) => {
    const match = value.toLowerCase().match(/\b(?:suite|ste|unit|apt|apartment|floor|fl|#)\s*([a-z0-9-]+)/);
    return match?.[1] ?? '';
  };
  const leftUnit = unit(input.address), rightUnit = unit(review.address);
  if (leftUnit !== rightUnit) return false;
  const street = (value: string) => {
    const normalized = normalizeBusiness(value);
    const suffixes: Record<string, string> = { st: 'street', street: 'street', ave: 'avenue', avenue: 'avenue', rd: 'road', road: 'road', blvd: 'boulevard', boulevard: 'boulevard', dr: 'drive', drive: 'drive', ct: 'court', court: 'court', pl: 'place', place: 'place', ter: 'terrace', terrace: 'terrace', pkwy: 'parkway', parkway: 'parkway', hwy: 'highway', highway: 'highway' };
    const suffix = Object.keys(suffixes).find((candidate) => normalized.endsWith(candidate) && normalized.length > candidate.length + 1);
    return { core: suffix ? normalized.slice(0, -suffix.length) : normalized, suffix: suffix ? suffixes[suffix] : null };
  };
  const left = street(input.address), right = street(review.address);
  return left.core === right.core && (!left.suffix || !right.suffix || left.suffix === right.suffix);
}

/** Match a pulled prospect only to an explicitly covered, exact government row.
 * Missing ZIPs, alternate names, and address-only overlaps stay in the queue.
 */
export function findCoveredGovernmentReview(
  input: { name: string; address: string | null | undefined; zip: string | null | undefined },
  candidates: GovernmentCandidate[],
  reviews: Record<string, GovernmentLocationReview>,
): GovernmentLocationReview | null {
  if (!input.address || !input.zip) return null;
  for (const candidate of candidates) {
    if (normalizeBusiness(candidate.name) !== normalizeBusiness(input.name)) continue;
    const key = governmentLocationKey(candidate.name, candidate.address, candidate.zip);
    if (!key) continue;
    const review = reviews[key];
    if (review?.status !== 'covered') continue;
    if (isSameGovernmentLocation({ name: input.name, address: input.address, zip: input.zip }, review)) return review;
  }
  return null;
}
