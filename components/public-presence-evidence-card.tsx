type PublicPresenceEvidenceCardProps = {
  location: string;
  identity: string;
  operation: string;
  locationType?: string | null;
  reviewNote?: string | null;
  websiteUrl?: string | null;
  websiteCheckedAt?: string | null;
  websiteStatus?: string | null;
  websiteIssues?: string[];
  mapsUrl?: string | null;
  mapsKind: 'specific_id' | 'search' | 'unverified_link' | 'invalid' | 'none';
  mapsIdentityVerified?: boolean;
  mapsReviewState: string;
  mapsReviewedAt?: string | null;
  phone?: string | null;
  email?: string | null;
  phoneConflict?: boolean;
  sourceUrl?: string | null;
  profileUrl?: string | null;
  profileLabel?: string;
  observedNeed?: string | null;
  evidenceDate: string;
};

export default function PublicPresenceEvidenceCard({
  location,
  identity,
  operation,
  locationType,
  reviewNote,
  websiteUrl,
  websiteCheckedAt,
  websiteStatus,
  websiteIssues = [],
  mapsUrl,
  mapsKind,
  mapsIdentityVerified = false,
  mapsReviewState,
  mapsReviewedAt,
  phone,
  email,
  phoneConflict = false,
  sourceUrl,
  profileUrl,
  profileLabel = 'Business profile',
  observedNeed,
  evidenceDate,
}: PublicPresenceEvidenceCardProps) {
  return (
    <section className="mt-4 rounded-xl border border-[#2b4350] bg-[#0d1921]/70 p-4" aria-label="Public presence evidence">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="kicker">Public presence · evidence only</p><h4 className="mt-1 font-semibold">What the saved sources show</h4></div>
        <span className="rounded-full border border-[#405562] px-2 py-1 text-[10px] text-[#b8cbd3]">Read only · no owner intent recorded</span>
      </div>
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-[#243745] p-3">
          <p className="font-semibold text-[#d8e6eb]">Identity and operation</p>
          <p className="muted mt-1">Identity: {identity}</p>
          <p className="muted mt-1">Operation: {operation}</p>
          <p className="muted mt-1">{location}</p>
          {locationType && <p className="muted mt-1">Location type: {locationType.replaceAll('_', ' ')}</p>}
          <p className="muted mt-2">Evidence reviewed: {evidenceDate}</p>
          {reviewNote && <p className="mt-2 text-[#c8d7dd]">Review note: {reviewNote}</p>}
        </div>
        <div className="rounded-lg border border-[#243745] p-3">
          <p className="font-semibold text-[#d8e6eb]">Website</p>
          <p className="muted mt-1">{websiteUrl ? 'Site recorded' : 'No site recorded in this source'}</p>
          {websiteUrl && <a className="mt-1 inline-block break-all text-cyan-300 underline" href={websiteUrl} target="_blank" rel="noopener noreferrer">{websiteUrl} ↗</a>}
          {websiteCheckedAt
            ? <p className="muted mt-2">Checked {websiteCheckedAt}{websiteStatus ? ` · ${websiteStatus}` : ''}</p>
            : <p className="muted mt-2">No measured website check is saved.</p>}
          {websiteIssues.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-100">{websiteIssues.slice(0, 4).map(issue => <li key={issue}>{issue}</li>)}</ul>}
          {websiteStatus && websiteStatus !== 'reachable' && <p className="mt-1 text-amber-100">This result is not a confirmed defect; retry in a normal browser before pitching a repair.</p>}
          {observedNeed && <p className="mt-2 text-[#c8d7dd]">Observed question: {observedNeed}</p>}
        </div>
        <div className="rounded-lg border border-[#243745] p-3">
          <p className="font-semibold text-[#d8e6eb]">Google Maps / Business Profile</p>
          <p className="muted mt-1">Review state: {mapsReviewState}</p>
          {mapsUrl && <a className="mt-1 inline-block break-all text-cyan-300 underline" href={mapsUrl} target="_blank" rel="noopener noreferrer">Open saved Google link ↗</a>}
          <p className="muted mt-1">{mapsKind === 'specific_id' ? mapsIdentityVerified ? 'Exact profile opened and matched to the reviewed name, address, and phone.' : 'Listing-specific link saved; name, address and phone still require a direct match.' : mapsKind === 'search' ? 'Search link only; it does not identify one exact listing.' : mapsKind === 'unverified_link' ? 'Link saved, but it is not a verified listing-specific URL.' : mapsKind === 'invalid' ? 'Saved link is not a usable Google Maps URL; recheck it before relying on this listing.' : 'No Google listing link saved.'}</p>
          {mapsReviewedAt && <p className="muted mt-1">Review date: {mapsReviewedAt}</p>}
        </div>
        <div className="rounded-lg border border-[#243745] p-3">
          <p className="font-semibold text-[#d8e6eb]">Public contact and sources</p>
          <p className="muted mt-1">Phone: {phone || 'not recorded'}{phoneConflict ? ' · source conflict' : ''}</p>
          <p className="muted mt-1">Email: {email || 'not recorded'}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {sourceUrl && <a className="text-cyan-300 underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">Original source ↗</a>}
            {profileUrl && <a className="text-cyan-300 underline" href={profileUrl} target="_blank" rel="noopener noreferrer">{profileLabel} ↗</a>}
          </div>
        </div>
      </div>
      <p className="muted mt-3 text-[11px]">A missing saved field means “not recorded here,” not proof that the business lacks it. Public evidence does not show whether an owner wants help or will buy.</p>
    </section>
  );
}
