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
