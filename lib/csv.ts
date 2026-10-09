// RFC4180-style CSV fields with escaped quotes and embedded line breaks.
// Preserves all original columns in staged raw_data for review.
export function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  const text = source.replace(/^\uFEFF/, '');
  for (let i=0; i<text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i+1] === '"') {field += '"';i++;}
      else if (c === '"') quoted = false;
      else field += c;
    } else {
      if (c === '"' && field === '') quoted = true;
      else if (c === ',') {row.push(field);field='';}
      else if (c === '\n') {row.push(field);rows.push(row);row=[];field='';}
      else if (c !== '\r') field += c;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quote.');
  if (row.length || field) {row.push(field);rows.push(row);}
  return rows.filter(r=>r.some(v=>v.trim()));
}
export function normalizedHeader(h:string): string { return h.toLowerCase().trim().replace(/[^a-z0-9]/g,''); }
export function normalizeBusiness(s:string):string {return s.toLowerCase().replace(/[^a-z0-9]/g,'');}
