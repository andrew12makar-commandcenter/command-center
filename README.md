# Command Center

Private Next.js infrastructure for the for-profit local-business services venture (separate from nonprofit Campus2Care). The MCAT module is scheduled separately.

## Current build

- Supabase-authenticated private workspace, organization memberships, and row-level access control.
- Live overview showing actual database counts.
- Business CRM: create business, update sales stage, assign evidence-based score, track contacts/follow-ups, and log activity.
- Business source links, manual source confirmation, separate operational/identity verification.
- CSV staging queue, up to 500 records per upload. Each row is individually reviewed before promotion. Possible exact normalized name+city duplicates are flagged, not merged automatically. CSV intake is **not** automated registry discovery.
- Demo studio with landscaping/home-services, medical/dental, and universal business concepts; one-off and batches of up to 20. Previews remain internal. No invented marketing claims.

## Local setup

Use Node.js 24 LTS when possible. Clone `feature/nextjs-foundation` (or use GitHub Desktop), then:

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run dev
```

Populate `.env.local` only with the Supabase project URL and **publishable** key, not the database password or service role key. The personal project has already been provisioned as of October 9, 2026.

## Database migrations

- `0001_foundation.sql`: original organization/data model, already applied manually to the separate Command Center Supabase project.
- **`0002_sales_workflows.sql`: NEW. Open in Supabase SQL Editor and execute once before using the new CRM screens.** Adds follow-up/contact fields, business activity and CSV staging, with explicit row-level policies and grants.

Do **not** rerun 0001. Do **not** create another organization or owner record. Existing login and org membership will continue working.

## Security and limitations

- Organization-scoped RLS, no service-role keys in the client.
- Manual evidence review does not guarantee real-time business operation: field check still required. The app requires confirmed operating status and one reviewed source for a verification designation.
- Staged records are not verified; detected duplicates are review flags only.
- CSV matching currently checks up to the first 1,000 business records; this is not full entity resolution. Improve before scaling beyond initial cohort.
- Internal concept previews are **not public client websites**. Password-protected expiring sharing, content editing, and actual hosted client demos still need implementation.
- Automated registry ingestion, scanning schedules, website audits, map view, opportunity scoring model, Vercel deployment, visual HUD/voice layer, and MCAT platform are **not yet built**.
- Do not use nonprofit-owned infrastructure or subscriptions for unrelated for-profit operations without explicit authorization.

## Tests

Run `npm run typecheck` then `npm run build`. The branch also has a GitHub Actions CI workflow. Do not merge until CI and a manual login/CRM smoke test pass.

## Demo improvement loop (migration 0003)

The demo generator began as a layout skeleton. The next increment makes it evaluable and editable:

- Apply `supabase/migrations/0003_demo_learning.sql` **once** to the existing Command Center Supabase database; do not rerun 0001/0002.
- New demos let an operator choose **Editorial**, **Bold**, or **Auto**.
- Rate each demo/version 1–5, tag specific issues, and leave notes. Ratings are stored per operator/demo/revision.
- Edit draft copy and confirmed services, then save a new version; prior copy is preserved in `demo_revisions` using an atomic database function.
- **Auto style now reacts to each saved rating immediately.** Recent per-user feedback for the same category takes priority; if none exists, other-category feedback provides a fallback. Low-scoring variants lose preference, high-scoring variants gain preference. Issue tags and recognized wording in feedback directly influence hero spacing, copy concision, and navigation in new drafts. The rated demo remains unchanged until the user chooses **Apply my preferences**; that creates a preserved revision.
- This is rules-based learning from user evaluations, **not** self-training a language model, autonomous image generation, or automatic validation of business claims.
- Approved images, client edit controls, full hosted website builds, and password-protected external share links remain future work.

### Local update
Use GitHub Desktop to pull `feature/nextjs-foundation`, apply migration 0003 in Supabase SQL Editor, then restart the local Next.js server. You do **not** need to create new users, keys, or projects.

## One-rating learning update

No new SQL migration is required beyond 0003. Every saved feedback event is already written to `demo_feedback`; the generator now reads authenticated user's feedback for every new site instead of waiting for five reviews. "What was learned" is visible below each demo. Numeric ratings and selected issue tags drive rules-based changes immediately. Unrecognized prose is stored for review but does not automatically prompt an AI or create unknown design changes. Optional "Apply my preferences" creates a revision of the current draft.

The feedback form layout also has properly sized, responsive radio and checkbox inputs; global text-input styling no longer stretches selection inputs.

## Manual local-business discovery pilot (Phase 4)

A new `/app/discovery` page offers **explicit user-triggered** sources:
- City of Boston certified-business directory (certified vendors only)
- City of Boston food establishment licenses
- OpenStreetMap local business POIs around Allston, Brighton or Brookline.

Every scan uses a bounded public-source request and stages at most 25/50/75 new records in the existing `lead_import_rows` review queue. The original source, source ID and raw details are retained. No new migration or API key is needed.

**Important limitations:** Boston Open Data APIs may return 403 or redirect to unapproved storage hosts. The interface displays a failure and leaves the database unchanged if so. You can instead download the official CSV and use the existing manual import page. OpenStreetMap is community data, subject to availability, attribution and ODbL licensing, and is not governmental verification. The source is only a lead to investigate. A bounded scan is not yet recurring automation. Duplicate protection currently checks known staged source IDs and a limited set of existing normalized names; more robust deduplication is needed before 500+ scale.

No third-party listings are presumed claimed. No prospect is marked verified by these scans. Source terms/rate limits must be respected before scheduling or scaling.
