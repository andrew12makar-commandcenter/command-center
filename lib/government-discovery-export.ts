import type { GovernmentCandidate } from './government-discovery.ts';

const HEADERS = [
  'candidate_id','source_row_index','business_name','legal_or_source_name','record_type','address','city','zip','license_status','license_type',
  'website','latitude','longitude','straight_line_miles_from_brighton_center','location_status','source_title',
  'source_record_id','source_url','download_url','downloaded_at','possible_duplicate_ids',
] as const;

function cell(value: unknown): string {
  const text = value === null || value === undefined ? '' : Array.isArray(value) ? value.join('; ') : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"','""')}"` : text;
}

export function serializeGovernmentCandidatesCsv(candidates: GovernmentCandidate[]): string {
  const rows = candidates.map((row) => [
    row.candidate_id,row.source_row_index,row.name,row.legal_name,row.category,row.address,row.city,row.zip,row.license_status,row.license_type,
    row.website,row.coordinates?.lat,row.coordinates?.lon,row.distance_miles,row.location_status,row.source_title,
    row.record_id,row.source_url,row.download_url,row.downloaded_at,row.possible_duplicate_ids,
  ]);
  return [HEADERS.join(','),...rows.map((row) => row.map(cell).join(','))].join('\r\n')+'\r\n';
}
