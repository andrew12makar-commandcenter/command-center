import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScreeningLedger, type ScreeningEntry } from './screening-ledger.ts';

export const TWO_NEED_PROSPECT_TARGET = 100;

export type BrightonShortlistLead = {
  rank: number;
  rosterStage: 'Core shortlist' | 'Carry-forward · recheck' | 'New addition';
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
  // False for carry-forward rows and for Core rows held after a later check.
  qualified: boolean;
  holdNote?: string;
  sources: { label: string; url: string }[];
};

// Names that do not reveal their category on their own.
const LEAD_TYPE_OVERRIDES: Record<string, string> = { yucoobrighton: 'Food & retail', thainorth: 'Food & retail' };

function classifyLeadType(value: string): string {
  const business = value.toLowerCase();
  const override = LEAD_TYPE_OVERRIDES[business.split(' · ')[0].replace(/[^a-z0-9]/g, '')];
  if (override) return override;
  if (/\b(farmers market|community market|farm market)\b/.test(business)) return 'Community & events';
  if (/\b(deli|markets?|convenience|produce|superette|supermarket|food|bazaar|tavern|restaurant|cellar|gourmet|variety|liquor|kwik|bubble tea|cafe|café|coffee|bakery|baker|grill|taqueria|tacos?|burrito|pizza|noodles?|pho|sushi|eatery|diner|bistro|kitchen|sandwich|grocery|ice cream|tea|juice)\b/.test(business)) return 'Food & retail';
  if (/\b(barber\w*|hair\w*|salon|nails?|skin care|beauty|esthetic|spa|massage)\b/.test(business)) return 'Personal care';
  if (/\b(auto|automotive|towing|body shop|car repair)\b/.test(business)) return 'Automotive';
  if (/\b(plumb\w*|landscap\w*|construction|garage door|electric\w*|contractor|painting|painter|handyman|roofing|hvac)\b/.test(business)) return 'Home services';
  if (/\b(pet|cat connection|day ?care|daycare|pupp\w*|child ?care|preschool|dog grooming)\b/.test(business)) return 'Pet & family services';
  if (/\b(clean\w*|laund\w*|shoe repair|tailor|alteration|upholster\w*|appliance repair)\b/.test(business)) return 'Local services';
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

// Core rows kept for continuity but excluded from the qualified count until a
// distinct second need is re-verified from current, reliable sources.
const HELD_CORE_ROWS: Record<string, string> = {
  cafemirror: 'Held 2026-10-18: a later check found no independent second need; the Yellow Pages hours difference alone is not enough.',
};

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
        rosterStage: 'Core shortlist' as const,
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
  const heldFromCurrentReview = new Set(['lrhairsalon', 'cambridgestreetautoservice', 'mattsbarbershop']);
  // Requalified rows now live in the expanded additions file with fresh evidence.
  const requalifiedCarryForward = new Set(['dorrsliquormart', 'ykminimarket', 'yucoobrighton', 'themoodthaispa', 'dflaccobarbershop', 'brooklinebarbershop']);
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
      if (heldFromCurrentReview.has(key) || requalifiedCarryForward.has(key)) return false;
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
      rosterStage: 'Carry-forward · recheck' as const,
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

  const expanded = readFileSync(join(process.cwd(), 'docs/brighton-expanded-100-prospect-additions-2026-10-17.md'), 'utf8');
  const expansionRows = expanded.split(/\r?\n/)
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length === 11)
    .map((cells, index) => ({
      rank: current.length + additions.length + index + 1,
      rosterStage: 'New addition' as const,
      business: cleanMarkdown(cells[1]),
      type: classifyLeadType(cleanMarkdown(cells[1])),
      distance: cleanMarkdown(cells[2]),
      publicContact: cleanMarkdown(cells[3]),
      websiteEvidence: cleanMarkdown(cells[4]),
      secondNeedEvidence: cleanMarkdown(cells[5]),
      pitchQuestion: cleanMarkdown(cells[6]),
      checked: cleanMarkdown(cells[7]),
      confidence: cleanMarkdown(cells[8]),
      evidenceGrade: cleanMarkdown(cells[9]),
      nextOffer: cleanMarkdown(cells[10]),
      sources: linksFrom(cells.slice(3, 9)),
    }));
  const existingNames = [...current, ...additions].map((lead) => lead.business.toLowerCase().split(' · ')[0].replace(/[^a-z0-9]/g, ''));
  const uniqueExpansion = expansionRows.filter((lead) => {
    const key = lead.business.toLowerCase().replace(/[^a-z0-9]/g, '');
    return !existingNames.some((existing) => existing === key || existing.startsWith(key) || key.startsWith(existing));
  });

  return [...current, ...additions, ...uniqueExpansion].map((lead, index) => {
    const holdNote = lead.rosterStage === 'Core shortlist' ? HELD_CORE_ROWS[lead.business.toLowerCase().split(' · ')[0].replace(/[^a-z0-9]/g, '')] : undefined;
    return { ...lead, rank: index + 1, qualified: lead.rosterStage !== 'Carry-forward · recheck' && !holdNote, ...(holdNote ? { holdNote } : {}) };
  });
}

export function getScreeningLedger(leads: BrightonShortlistLead[] = getBrightonShortlist()): ScreeningEntry[] {
  const csv = readFileSync(join(process.cwd(), 'docs/brighton-candidate-screening-ledger.csv'), 'utf8');
  // Held Core rows stay in the ledger; other roster rows are not listed twice.
  return parseScreeningLedger(csv, leads.filter((lead) => !lead.holdNote).map((lead) => lead.business));
}
