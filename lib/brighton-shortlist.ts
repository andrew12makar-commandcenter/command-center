import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const TWO_NEED_PROSPECT_TARGET = 100;

export type BrightonShortlistLead = {
  rank: number;
  business: string;
  distance: string;
  publicContact: string;
  websiteEvidence: string;
  secondNeedEvidence: string;
  pitchQuestion: string;
  checked: string;
  confidence: string;
  evidenceGrade: string;
  type: string;
  nextOffer: string;
  sources: { label: string; url: string }[];
};

function classifyLeadType(value: string): string {
  const business = value.toLowerCase();
  if (/deli|market|convenience|produce|superette|supermarket|food|bazaar|tavern|restaurant|cellar|gourmet|variety|liquor|kwik|bubble tea/.test(business)) return 'Food & retail';
  if (/barber|hair|salon|nail|skin care|beauty|esthetic|spa|massage/.test(business)) return 'Personal care';
  if (/auto|towing/.test(business)) return 'Automotive';
  if (/plumb|landscap|construction|garage door|electric/.test(business)) return 'Home services';
  if (/pet|cat connection|day ?care|pupp/.test(business)) return 'Pet & family services';
  if (/clean|laund|shoe repair|tailor|alteration|upholster/.test(business)) return 'Local services';
  return 'Local services';
}

function cleanMarkdown(value: string) {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function linksFrom(cells: string[]) {
  const links = [...cells.join(' ').matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)]
    .map((match) => ({ label: match[1], url: match[2] }));
  return links.filter((link, index) => links.findIndex((candidate) => candidate.url === link.url) === index);
}

export function getBrightonShortlist(): BrightonShortlistLead[] {
  const markdown = readFileSync(join(process.cwd(), 'docs/brighton-website-plus-maps-shortlist-2026-10-17.md'), 'utf8');

  const current = markdown.split(/\r?\n/)
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      const missingPitchQuestion = cells.length === 10;
      const checkedIndex = missingPitchQuestion ? 6 : 7;
      const confidenceIndex = missingPitchQuestion ? 7 : 8;
      const gradeIndex = missingPitchQuestion ? 8 : 9;
      const offerIndex = missingPitchQuestion ? 9 : 10;
      return {
        rank: Number(cells[0]),
        business: cleanMarkdown(cells[1]),
        type: classifyLeadType(cleanMarkdown(cells[1])),
        distance: cleanMarkdown(cells[2]),
        publicContact: cleanMarkdown(cells[3]),
        websiteEvidence: cleanMarkdown(cells[4]),
        secondNeedEvidence: cleanMarkdown(cells[5]),
        pitchQuestion: missingPitchQuestion
          ? 'Confirm the separate operator, current location and profile details before counting this as a distinct prospect.'
          : cleanMarkdown(cells[6]),
        checked: cleanMarkdown(cells[checkedIndex]),
        confidence: cleanMarkdown(cells[confidenceIndex]),
        evidenceGrade: cleanMarkdown(cells[gradeIndex]),
        nextOffer: cleanMarkdown(cells[offerIndex]),
        sources: linksFrom(cells.slice(3, 9)),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  // Carry forward the earlier, field-researched shortlist so its verified
  // website/Maps issues remain visible while the newer candidates stay intact.
  const prior = readFileSync(join(process.cwd(), 'docs/brighton-prior-40-prospect-baseline-2026-10-17.md'), 'utf8');
  const heldFromCurrentReview = new Set(['lrhairsalon', 'cambridgestreetautoservice']);
  const carriedForward = prior.split(/\r?\n/)
    .filter((line) => line.startsWith('| **Shortlist** |'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length === 6)
    .map((cells) => {
      const identity = cells[1].match(/\*\*(.*?)\*\*/)?.[1] ?? cells[1];
      const key = identity.toLowerCase().replace(/[^a-z0-9]/g, '');
      return { cells, identity, key };
    })
    .filter(({ key }) => {
      if (heldFromCurrentReview.has(key)) return false;
      const existingNames = current.map((lead) => lead.business.toLowerCase().split(' · ')[0].replace(/[^a-z0-9]/g, ''));
      const aliasKey = key === 'ensuenobodyskincareclinic' ? 'ensuenoskincare' : key;
      return !existingNames.some((existing) => existing === aliasKey || existing === key || existing.startsWith(key) || key.startsWith(existing));
    });

  const additions = carriedForward.map(({ cells, identity }, index) => {
    const fullIdentity = cleanMarkdown(cells[1]);
    const distance = fullIdentity.match(/(?:~|about\s*)?[\d.]+\s*mi/i)?.[0] ?? 'Distance not recorded';
    const confidence = cleanMarkdown(cells[5]);
    return {
      rank: current.length + index + 1,
      business: fullIdentity.replace(/\s*·\s*(?:~|about\s*)?[\d.]+\s*mi.*$/i, ''),
      type: classifyLeadType(identity),
      distance,
      publicContact: cleanMarkdown(cells[2]),
      websiteEvidence: cleanMarkdown(cells[3]),
      secondNeedEvidence: cleanMarkdown(cells[4]),
      pitchQuestion: cleanMarkdown(cells[4]),
      checked: '2026-10-16/17 research pass',
      confidence,
      evidenceGrade: /high observable/i.test(confidence) ? 'A' : 'B',
      nextOffer: cleanMarkdown(cells[4]),
      sources: linksFrom(cells.slice(2, 6)),
    };
  });

  return [...current, ...additions].map((lead, index) => ({ ...lead, rank: index + 1 }));
}
