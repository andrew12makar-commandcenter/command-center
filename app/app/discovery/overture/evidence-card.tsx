'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cc-overture-public-evidence-v1';

type Candidate = {
 name: string; street: string | null; city: string | null; postcode: string | null;
 phone: string | null; website: string | null; sourceUrl: string | null;
};
type Evidence = {
 mapsUrl: string; websiteOrBookingUrl: string; operatingSignal: string;
 specificNeed: string; publicContact: string; notes: string; checkedAt: string;
};
type EvidenceStore = Record<string, Evidence>;

function candidateKey(candidate: Candidate) {
 return [candidate.name, candidate.street, candidate.city, candidate.postcode].map((part) => (part || '').trim().toLocaleLowerCase()).join('|');
}
function emptyEvidence(): Evidence {
 return { mapsUrl: '', websiteOrBookingUrl: '', operatingSignal: '', specificNeed: '', publicContact: '', notes: '', checkedAt: '' };
}
function validPublicUrl(value: string) {
 try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; }
}

export default function PublicEvidenceCard({ candidate }: { candidate: Candidate }) {
 const key = candidateKey(candidate);
 const [store, setStore] = useState<EvidenceStore>({});
 const [opened, setOpened] = useState(false);
 const [loaded, setLoaded] = useState(false);
 const [saved, setSaved] = useState(false);
 const [error, setError] = useState('');
 const savedEvidence = store[key] || emptyEvidence();
 const [draft, setDraft] = useState<Evidence>(savedEvidence);

 useEffect(() => {
  let parsedStore: EvidenceStore = {};
  let storageError = false;
  try {
   const raw = window.localStorage.getItem(STORAGE_KEY);
   if (raw) {
    const parsed = JSON.parse(raw) as EvidenceStore;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) parsedStore = parsed;
   }
  } catch { storageError = true; }
  queueMicrotask(() => {
   setStore(parsedStore);
   setDraft(parsedStore[key] || emptyEvidence());
   if (storageError) setError('This browser could not read local research storage.');
   setLoaded(true);
  });
 }, [key]);

 function update(field: keyof Evidence, value: string) {
  setDraft((current) => ({ ...current, [field]: value }));
  setSaved(false);
  setError('');
 }
 function save() {
  for (const url of [draft.mapsUrl, draft.websiteOrBookingUrl]) {
   if (url && !validPublicUrl(url)) { setError('Enter a full http or https link, or leave the link blank.'); return; }
  }
  const nextEvidence = { ...draft, checkedAt: new Date().toISOString() };
  const next = { ...store, [key]: nextEvidence };
  try {
   window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
   setStore(next);
   setDraft(nextEvidence);
   setSaved(true);
   setError('');
  } catch { setError('Could not save in this browser. No shared data was changed.'); }
 }
 function clear() {
  const next = { ...store };
  delete next[key];
  try {
   window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
   setStore(next);
   setDraft(emptyEvidence());
   setSaved(false);
   setError('');
  } catch { setError('Could not clear this browser’s saved research.'); }
 }

 const hasNotes = Boolean(savedEvidence.mapsUrl || savedEvidence.websiteOrBookingUrl || savedEvidence.operatingSignal || savedEvidence.specificNeed || savedEvidence.publicContact || savedEvidence.notes);
 return <div className="min-w-64">
  <button type="button" className="rounded-lg border border-[#365663] bg-[#102630] px-3 py-2 text-left text-xs font-semibold text-cyan-100 hover:border-cyan-400" aria-expanded={opened} onClick={() => setOpened((value) => !value)}>
   {opened ? 'Close evidence card' : hasNotes ? 'Review saved evidence' : 'Add public evidence'}
   {hasNotes && <span className="ml-2 rounded-full border border-emerald-700 px-2 py-0.5 text-[10px] text-emerald-200">Saved locally</span>}
  </button>
  {opened && <section className="mt-3 w-[min(86vw,420px)] rounded-xl border border-[#365663] bg-[#0c1a22] p-4 text-xs shadow-xl" aria-label={`Public evidence for ${candidate.name}`}>
   <p className="font-semibold text-slate-100">Public presence review</p>
   <p className="muted mt-1 leading-5">Save what you personally checked for this exact business. Research stays in this browser and does not qualify or import the candidate.</p>
   <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
    {candidate.phone && <a className="rounded border border-[#365663] px-2 py-1 text-cyan-200 underline" href={`tel:${candidate.phone.replace(/[^+\d]/g, '')}`}>Source phone: {candidate.phone}</a>}
    {candidate.sourceUrl && validPublicUrl(candidate.sourceUrl) && <a className="rounded border border-[#365663] px-2 py-1 text-cyan-200 underline" href={candidate.sourceUrl} target="_blank" rel="noreferrer">Open map-data source ↗</a>}
   </div>
   <label className="mt-3 block">Exact Google Maps profile<input className="mt-1 w-full" type="url" placeholder="https://www.google.com/maps/place/…" value={draft.mapsUrl} onChange={(event) => update('mapsUrl', event.target.value)} /></label>
   <label className="mt-3 block">Business website, booking or ordering page<input className="mt-1 w-full" type="url" placeholder="https://…" value={draft.websiteOrBookingUrl} onChange={(event) => update('websiteOrBookingUrl', event.target.value)} /></label>
   <label className="mt-3 block">Current operating signal<textarea className="mt-1 min-h-16 w-full" maxLength={400} placeholder="For example: recent owner reply, current hours, live booking slots. Say what you observed." value={draft.operatingSignal} onChange={(event) => update('operatingSignal', event.target.value)} /></label>
   <label className="mt-3 block">Specific service need you observed<textarea className="mt-1 min-h-16 w-full" maxLength={500} placeholder="Describe a visible issue, such as missing hours or a broken booking path. Missing source data alone is not proof." value={draft.specificNeed} onChange={(event) => update('specificNeed', event.target.value)} /></label>
   <label className="mt-3 block">Public contact path<input className="mt-1 w-full" maxLength={200} placeholder="Phone, contact page, or public business email" value={draft.publicContact} onChange={(event) => update('publicContact', event.target.value)} /></label>
   <label className="mt-3 block">Source notes<textarea className="mt-1 min-h-16 w-full" maxLength={800} placeholder="Where you checked the claim and any uncertainty" value={draft.notes} onChange={(event) => update('notes', event.target.value)} /></label>
   {savedEvidence.checkedAt && <p className="muted mt-3">Last checked {new Date(savedEvidence.checkedAt).toLocaleString()}</p>}
   {error && <p role="alert" className="mt-3 text-rose-200">{error}</p>}
   {saved && <p role="status" className="mt-3 text-emerald-200">Saved in this browser. No CRM or shared record changed.</p>}
   <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn !px-3 !py-2 text-xs" onClick={save} disabled={!loaded}>Save local research</button>{hasNotes && <button type="button" className="rounded-lg border border-[#45616c] px-3 py-2 text-xs" onClick={clear}>Clear this business</button>}</div>
  </section>}
 </div>;
}
