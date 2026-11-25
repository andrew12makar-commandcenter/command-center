import PublicPresenceEvidenceCard from '@/components/public-presence-evidence-card';

export default function PublicPresencePreview() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
      <p className="kicker">Command Center · local preview</p>
      <h1 className="mt-2 text-3xl font-semibold">Public presence evidence</h1>
      <p className="muted mt-3 max-w-3xl text-sm leading-6">
        This read-only preview uses public information about Missing Sock Laundromat. It does not connect to or change CRM records. Public evidence shows what can be checked; it does not establish whether the owner wants help.
      </p>
      <div className="mt-6 rounded-xl border border-emerald-700/60 bg-emerald-950/25 p-4 text-sm text-emerald-100">
        <strong>Isolated preview.</strong> Buttons on this page only open source links. Nothing is saved, imported, scored, or sent.
      </div>
      <article className="panel mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Missing Sock Laundromat</h2>
            <p className="muted mt-1 text-sm">Local service business · 1846A Commonwealth Ave, Brighton, MA 02135 · 0.64 straight-line miles from Brighton Center</p>
          </div>
          <span className="rounded-full border border-amber-700/60 px-3 py-1 text-xs text-amber-100">Conversation idea · verify with operator</span>
        </div>
        <PublicPresenceEvidenceCard
          location="1846A Commonwealth Ave, Brighton, MA 02135"
          identity="Name, address, and phone match between the visible Google Maps listing and first-party site"
          operation="Open hours shown on Maps; UPS Access Point directory also lists this address and current hours"
          locationType="storefront"
          reviewNote="Maps showed 3.5 stars across 51 reviews during the live check. Treat that as a fit question, not a website sales claim."
          websiteUrl="https://www.missing-sock.com/prices/"
          websiteIssues={[
            'In the repeated footer, wash-and-fold delivery text says the fee beyond two miles is $10, then the next line says $1.80 per pound. The main price summary presents that service differently.',
          ]}
          mapsUrl="https://www.google.com/maps/place/Missing-Sock+Laundromat/@42.3392659,-71.151706,17z/data=!3m1!4b1!4m6!3m5!1s0x89e37851e5004d25:0x4a1f32b75574b19e!8m2!3d42.3392659!4d-71.151706!16s%2Fg%2F1wfvnnqm"
          mapsKind="specific_id"
          mapsIdentityVerified
          mapsReviewState="Exact listing address, phone, hours, and website visually checked in the live Maps profile"
          mapsReviewedAt="2026-10-16"
          phone="617-566-4777"
          email="ddjia2005@hotmail.com"
          sourceUrl="https://locations.ups.com/us/en/ma/brighton/access-point-location-244555.html"
          profileUrl="https://www.missing-sock.com/prices/"
          profileLabel="First-party website"
          observedNeed="Ask whether the delivery-fee wording is current and whether they want the online rates made consistent. Do not suggest a rebuild or promise more customers."
          evidenceDate="2026-10-16"
        />
      </article>
      <p className="muted mt-4 text-xs">Sources were reviewed October 16, 2026. The website pricing discrepancy is an observable question, not proof of lost sales or owner intent. No Lighthouse report was run for this business.</p>
    </main>
  );
}
