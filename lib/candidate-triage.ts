import { assessTargetFit, type TargetFit } from './target-fit.ts';

export type TriageCandidate = {
  name: string;
  category?: string | null;
  website?: string | null;
  unverifiedWebsiteUrls?: string[] | null;
  thirdPartyUrls?: string[] | null;
  phone?: string | null;
  email?: string | null;
  flags?: string[] | null;
};

export type ResearchBand = 'review_first' | 'research_later' | 'lower_priority';

export type CandidateTriage = {
  fit: TargetFit;
  band: ResearchBand;
  siteEvidence: 'website_recorded' | 'possible_mismatch' | 'third_party_only' | 'no_url_in_source';
  hasContactPath: boolean;
  reasons: string[];
};

const REVIEW_LIMITING_FLAGS = /institutional_address|national_or_regional_brand|multi_location|individual_practitioner_listing|chain|franchise/i;

/** Research order only. This does not predict purchase likelihood or qualify a lead. */
export function triageDiscoveryCandidate(candidate: TriageCandidate): CandidateTriage {
  const fit = assessTargetFit(candidate.name, candidate.category);
  const flags = candidate.flags ?? [];
  const reviewLimited = flags.some((flag) => REVIEW_LIMITING_FLAGS.test(flag));
  const hasContactPath = Boolean(candidate.phone?.trim() || candidate.email?.trim());
  const hasCategory = Boolean(candidate.category?.trim());
  const siteEvidence: CandidateTriage['siteEvidence'] = candidate.website?.trim()
    ? 'website_recorded'
    : candidate.unverifiedWebsiteUrls?.length
      ? 'possible_mismatch'
      : candidate.thirdPartyUrls?.length
        ? 'third_party_only'
        : 'no_url_in_source';

  const reasons: string[] = [fit.reason];
  if (siteEvidence === 'no_url_in_source') reasons.push('No website URL was accepted from this map source; check first-party sources before calling it a website gap.');
  if (siteEvidence === 'possible_mismatch') reasons.push('A possible website match needs identity review.');
  if (siteEvidence === 'third_party_only') reasons.push('The source has third-party links, not a confirmed business-owned website.');
  if (!hasContactPath) reasons.push('No phone or email is recorded in this map row.');
  if (!hasCategory) reasons.push('No business category is recorded; verify the identity and business type before prioritizing it.');
  if (reviewLimited) reasons.push('A chain, practitioner, or shared-office clue may limit fit or create an identity problem.');

  const band: ResearchBand = fit.fit === 'possible_out_of_scope' || reviewLimited
    ? 'lower_priority'
    : fit.fit === 'likely_target' && hasCategory && siteEvidence === 'no_url_in_source' && hasContactPath
      ? 'review_first'
      : 'research_later';

  return { fit: fit.fit, band, siteEvidence, hasContactPath, reasons };
}
