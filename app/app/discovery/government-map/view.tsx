'use client';

import { useMemo, useState } from 'react';
import type { GovernmentCandidate } from '@/lib/government-discovery';
import { governmentLocationKey, type GovernmentLocationReview } from '@/lib/government-location-review';
import { saveLocationReview } from './actions';

const WIDTH = 900, HEIGHT = 460, PAD = 36;
export default function GovernmentMap({ candidates, origin, reviews, selectedId, error, saved }: {
 candidates: GovernmentCandidate[]; origin: { label: string; lat: number; lon: number };
 reviews: Record<string, GovernmentLocationReview>; selectedId?: string; error?: string; saved?: string;
}) {
  const [selected, setSelected] = useState<string | null>(selectedId ?? null);
  const reviewFor = (row: GovernmentCandidate) => { const key=governmentLocationKey(row.name,row.address,row.zip);return key?reviews[key]??null:null; };
  const mapped = useMemo(() => candidates.filter((row) => row.coordinates && row.distance_miles !== null), [candidates]);
  const unplaced = useMemo(() => candidates.filter((row) => !row.coordinates || row.distance_miles === null), [candidates]);
  const points = useMemo(() => {
    const cosLatitude = Math.cos((origin.lat * Math.PI) / 180);
    const projected = mapped.map((row) => ({ row,
      east: (row.coordinates!.lon - origin.lon) * cosLatitude,
      north: row.coordinates!.lat - origin.lat,
    }));
    const eastValues = [...projected.map((x) => x.east), 0], northValues = [...projected.map((x) => x.north), 0];
    const spanEast = Math.max(...eastValues) - Math.min(...eastValues) || 1;
    const spanNorth = Math.max(...northValues) - Math.min(...northValues) || 1;
    const centerEast = (Math.max(...eastValues) + Math.min(...eastValues)) / 2;
    const centerNorth = (Math.max(...northValues) + Math.min(...northValues)) / 2;
    const scale = Math.min((WIDTH - PAD * 2) / spanEast, (HEIGHT - PAD * 2) / spanNorth);
    const chart = projected.map(({ row, east, north }) => ({ row,
      x: Math.round(WIDTH / 2 + (east - centerEast) * scale),
      y: Math.round(HEIGHT / 2 - (north - centerNorth) * scale),
    }));
    const originPoint = { east: 0, north: 0 };
    const plotted: { row: GovernmentCandidate | null; x: number; y: number }[] = chart;
    plotted.push({
      row: null,
      x: Math.round(WIDTH / 2 + (originPoint.east - centerEast) * scale),
      y: Math.round(HEIGHT / 2 - (originPoint.north - centerNorth) * scale),
    });
    return plotted;
  }, [mapped, origin]);
  const shortlist = useMemo(() => [...mapped].sort((a, b) => a.distance_miles! - b.distance_miles!).slice(0, 60), [mapped]);
  const focus = selected ? candidates.find((x) => x.candidate_id === selected) : null;
  return <div>
    <p className="muted px-2 pb-2 text-xs">Record points are plotted by their downloaded coordinates. This schematic does not show roads or travel time.</p>
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${mapped.length} Boston government records plotted by coordinates`} className="min-w-[650px] w-full rounded-lg border border-[#223944] bg-[#0d1d27]">
        <defs><pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M 56 0 L 0 0 0 56" fill="none" stroke="#1d3440" strokeWidth="1"/></pattern></defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#grid)"/>
        <text x={PAD} y={24} fill="#8eb5bf" fontSize="12">N ↑</text>
        {points.map(({ row, x, y }) => {
          if (!row) return <g key="brighton-center" transform={`translate(${x},${y})`}><path d="M0 -10 L9 8 L-9 8 Z" fill="#e9fbff" stroke="#30b8c8" strokeWidth="2"/><text x="12" y="4" fill="#e9fbff" fontSize="12" fontWeight="700">Brighton Center</text></g>;
          const key = row.candidate_id, covered=reviewFor(row)?.status==='covered';
          return <g key={key} tabIndex={0} role="button" aria-label={`${row.name}, ${row.address}, ${row.distance_miles} miles${covered?', covered and removed from lead list':''}`} onClick={() => setSelected(key)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelected(key); }}>
            <circle cx={x} cy={y} r={covered?7:selected===key?7:4} fill={covered?'#6e2837':row.source_id.includes('food')?'#73d9e3':'#f2b96b'} stroke={selected===key?'#fff':covered?'#ff8fa0':'#08202a'} strokeWidth={selected===key?2:1}/>
            {covered&&<path d={`M${x-3} ${y-3} L${x+3} ${y+3} M${x+3} ${y-3} L${x-3} ${y+3}`} stroke="#fff" strokeWidth="1.8"/>}
            <title>{`${row.name} · ${row.address} · ${row.distance_miles} miles · ${covered?'covered and removed from lead list':row.source_title}`}</title>
          </g>;
        })}
        <g transform={`translate(${WIDTH - 210},${HEIGHT - 45})`}><circle cx="0" cy="0" r="5" fill="#73d9e3"/><text x="12" y="4" fill="#d2e4e8" fontSize="12">Food permits</text><circle cx="112" cy="0" r="5" fill="#f2b96b"/><text x="124" y="4" fill="#d2e4e8" fontSize="12">Other records</text></g>
      </svg>
    </div>
    {focus && <section className="mt-3 rounded-lg border border-cyan-900 bg-[#10252e] p-4 text-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong>{focus.name}</strong><span className="muted"> · {focus.address} · {focus.distance_miles} straight-line miles · {focus.source_title}</span>{focus.possible_duplicate_ids.length>0&&<span className="ml-2 text-amber-200">Possible duplicate source rows. This review applies to this exact name and full address.</span>}</div>{reviewFor(focus)?.status==='covered'&&<span className="rounded-full border border-rose-500/60 px-2 py-1 text-xs font-semibold text-rose-200">X · Covered, removed from lead list</span>}{reviewFor(focus)?.status==='researching'&&<span className="rounded-full border border-amber-500/60 px-2 py-1 text-xs text-amber-100">Research saved · still in lead list</span>}</div>
      {error&&<p role="alert" className="mt-3 rounded-md border border-rose-700/60 bg-rose-950/30 p-2 text-xs text-rose-100">{error}</p>}{saved&&<p role="status" className="mt-3 text-xs text-emerald-200">Review saved locally. {saved==='covered'?'The matching candidate is hidden from the default lead list.':'This location remains in the prospect list.'}</p>}
      <p className="muted mt-3 text-xs leading-5">Check public sources yourself. Only mark covered after confirming the exact Maps profile, a working strong business website, and a specific SEO strength. Search/map source records alone do not prove those things.</p>
      <form action={saveLocationReview} className="mt-4 grid gap-3 sm:grid-cols-2">
       <input type="hidden" name="candidate_id" value={focus.candidate_id}/>
       <label className="text-xs sm:col-span-2">Exact Google Business Profile / Maps link<input className="mt-1" name="google_profile_url" type="url" defaultValue={reviewFor(focus)?.google_profile_url||''} placeholder="https://www.google.com/maps/place/…"/><span className="muted mt-1 block">Use the exact place profile, not a broad search.</span></label>
       <label className="text-xs">Working business website<input className="mt-1" name="website_url" type="url" defaultValue={reviewFor(focus)?.website_url||focus.website||''} placeholder="https://business.example"/></label>
       <label className="text-xs">SEO evidence source<input className="mt-1" name="seo_evidence_url" type="url" defaultValue={reviewFor(focus)?.seo_evidence_url||''} placeholder="https://…"/></label>
       <label className="flex items-start gap-2 text-xs"><input className="mt-0.5" type="checkbox" name="maps_profile_confirmed" defaultChecked={reviewFor(focus)?.maps_profile_confirmed||false}/><span>Exact Google profile and Maps pin match this name, street, and storefront.</span></label>
       <label className="flex items-start gap-2 text-xs"><input className="mt-0.5" type="checkbox" name="website_strong" defaultChecked={reviewFor(focus)?.website_strong||false}/><span>Website works and is complete enough for this type of business.</span></label>
       <label className="flex items-start gap-2 text-xs"><input className="mt-0.5" type="checkbox" name="seo_strong" defaultChecked={reviewFor(focus)?.seo_strong||false}/><span>Specific SEO strength was observed and is supported by the linked evidence.</span></label>
       <label className="text-xs sm:col-span-2">What you checked<textarea className="mt-1 min-h-20 w-full" name="evidence_note" maxLength={500} defaultValue={reviewFor(focus)?.evidence_note||''} placeholder="For example: exact profile and address match; official site loads and lists services; first-page local search result for a relevant service."/></label>
       <div className="flex flex-wrap gap-2 sm:col-span-2"><button className="btn !px-3 !py-2 text-xs" name="intent" value="researching" type="submit">Save research, keep in leads</button><button className="rounded-lg border border-rose-500/60 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-100" name="intent" value="covered" type="submit">Mark strong presence, X and remove from leads</button>{reviewFor(focus)?.status==='covered'&&<button className="rounded-lg border border-[#45616c] px-3 py-2 text-xs text-cyan-100" name="intent" value="researching" type="submit">Reopen in lead list</button>}</div>
      </form>
    </section>}
    <div className="mt-5"><h3 className="text-sm font-semibold">Nearest mapped records <span className="muted font-normal">· first 60 of {mapped.length}; X marks are covered locations already removed from default prospect lists</span></h3><div className="mt-2 overflow-x-auto"><table><thead><tr><th>Distance</th><th>Name on city record</th><th>Address</th><th>Type on record</th><th>Source</th><th>Lead review</th></tr></thead><tbody>
      {shortlist.map((row) => { const key = row.candidate_id, review=reviewFor(row); return <tr key={key} className={selected === key ? 'bg-[#12303a]' : undefined} onClick={() => setSelected(key)}><td>{row.distance_miles} mi</td><td className="font-medium">{row.name}{row.possible_duplicate_ids.length > 0 && <span className="ml-2 text-xs text-amber-200">Review duplicate</span>}</td><td>{row.address}, {row.zip}</td><td>{row.category}</td><td>{row.source_title}</td><td>{review?.status==='covered'?<span className="text-rose-200">X · Removed</span>:review?.status==='researching'?<span className="text-amber-100">Researching</span>:<span className="muted">Unscreened</span>}</td></tr>; })}
    </tbody></table></div></div>
    {unplaced.length > 0 && <div className="mt-7"><h3 className="text-sm font-semibold">Unplaced records <span className="muted font-normal">· {unplaced.length} need address matching</span></h3>
      <p className="muted mt-1 text-xs">These records have no usable coordinate in the city file. They remain in the CSV, but are not given a distance or placed on the map.</p>
      <div className="mt-2 max-h-[26rem] overflow-auto rounded-lg border border-[#29434e]"><table><thead><tr><th>Name on city record</th><th>Address</th><th>Type on record</th><th>Source</th></tr></thead><tbody>
        {unplaced.map((row)=><tr key={row.candidate_id}><td className="font-medium">{row.name}</td><td>{row.address}, {row.zip}</td><td>{row.category}</td><td>{row.source_title}</td></tr>)}
      </tbody></table></div></div>}
  </div>;
}
