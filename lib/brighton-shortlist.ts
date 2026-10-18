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
  nextOffer: string;
  sources: { label: string; url: string }[];
};

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
  const markdown = readFileSync(
    join(process.cwd(), 'docs/brighton-website-plus-maps-shortlist-2026-10-17.md'),
    'utf8',
  );

  return markdown.split(/\r?\n/)
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
}
