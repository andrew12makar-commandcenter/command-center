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

## Phase 5: Evidence-based Website Intelligence

At `/app/intelligence` users can trigger a single mobile Lighthouse website check against an **approved CRM prospect**. The app calls Google's `PageSpeed Insights v5` REST API and saves a curated timestamped record to the existing RLS-protected `website_assessments` table. **No new Supabase migration is required.**

No direct backend requests are made to prospect websites. The site URL is restricted to public HTTP/HTTPS domain names without embedded credentials, and query strings are stripped before sending to Google. The PageSpeed endpoint is always a fixed Google domain. Optional `PAGESPEED_API_KEY` may be provided privately in `.env.local` if Google requires an API key or the public quota is exhausted.

Each successful assessment reports mobile lab performance and SEO categories, basic title/meta/viewport/crawlability audits, and a reproducible preliminary technical-improvement score. Missing API results, rate limits and website errors are recorded as **inconclusive**, never passed off as website defects. An owner can repeat scans no more than every 20 minutes per business.

**This is not overall lead scoring.** It does not estimate client budget, Google Business Profile ownership, competitive ranking or whether a business has *no* website. The existing manually entered `priority_score` remains untouched. This is a live external integration, so its network success must be tested from the user's running Next.js application.

Next: review the 25 Brighton candidates; promote genuine matches and link their actual websites; test a handful of Lighthouse checks; then build a composite scored priority with explicit unknown data and business value weighting. Avoid any claim that PageSpeed alone proves sales opportunity.

## Phase 5 follow-up: PageSpeed quotas and local Lighthouse fallback

The Website Intelligence page now shows **only whether** a server-side `PAGESPEED_API_KEY` is configured; it never displays the key. Google's public API permits keyless testing, but recommends a project key for frequent requests; HTTP 429 may still happen with a key. Enable PageSpeed Insights API for your **own separate for-profit Google Cloud project**, create a restricted key and put it in your existing private `.env.local` file under `PAGESPEED_API_KEY` (no `NEXT_PUBLIC_` prefix). Restart the local Next.js server. Do not commit or share keys. See the [official instructions](https://developers.google.com/speed/docs/insights/v5/get-started).

When the remote API is rate-limited, manually open a business's independent homepage in Chrome → DevTools → Lighthouse, run a **mobile** Lighthouse report and export **JSON**. Website Intelligence accepts native JSON (up to 8 MB) from the last seven days, and only when its requested/final URL matches the CRM site's domain and path. The original Lighthouse `fetchTime`, curated scores, and evidence are saved to the existing `website_assessments` table. The record is clearly labelled **operator-imported local Lighthouse** and does **not** claim independent Google API authentication. This fallback makes the full CRM → website analysis → Opportunity Board sequence testable without Google's live API quota. No new migration or database reset is required.

The manually imported JSON may be edited before upload, so treat all findings as **operator-supplied research evidence**, not independently verified commercial claims. Never infer revenue, owner intent, verified operating status, or the existence/absence of an independent website from Lighthouse alone.


## Phase 7 pilot: Free local Lighthouse queue (no API key or credits)

The private Website Intelligence page includes a **Local Lighthouse audit queue** section while Next.js runs in development mode on your Mac. This is NOT exposed in production. It uses open-source Lighthouse via the Node CLI, not Google's hosted PageSpeed Insights API. The initial pilot keeps full user control and reuses the existing Supabase assessment uploader.

**First run:**

1. Pull the existing `feature/nextjs-foundation` branch. Your current `.env.local` is preserved.
2. Run the existing Next.js site with `npm run dev`. Do not start a second server when one is already running.
3. Navigate to `http://localhost:3000/app/intelligence#local-lighthouse-queue`, select 1–10 CRM sites (only known independent websites), check the explicit approval box, then click **Download approved audit queue**. It saves a one-hour, authenticated JSON manifest to Downloads.
4. Install the local Lighthouse executable once with `npm install --save-dev lighthouse@13.0.0` (already completed on the original Mac). Verify with `./node_modules/.bin/lighthouse --version`. Keep `package.json` and `package-lock.json` together when committing the dependency later.
5. In a **separate VS Code terminal** within this repo, run `npm run audit:local -- ~/Downloads/command-center-audit-queue.json`.
6. Read the exact business names/URLs, type `RUN` to approve. The runner checks URL safety and public DNS, performs one Lighthouse mobile performance/SEO test at a time in headless Chrome, waits four seconds between sites and writes raw JSON under `.local-lighthouse/<batch>/`. Press Control+C to stop. The runner uses only the previously installed `node_modules/.bin/lighthouse`; it never invokes `npx` or downloads a package during an audit. Node.js 22+ and local Chrome are required. Audits do not modify the project lockfile or your regular browser profile.
7. For each finished report, open the existing **Import a Chrome Lighthouse report** form on Website Intelligence, select the matching CRM business, choose `<business-id>.json`, and upload. This saves evidence through the existing authenticated, organization-scoped Supabase write action. The Opportunity Board and Opportunity Brief will update from saved eligible reports.

**Limitations and safety:** This pilot uses manual file import; it does not automatically save scans or show live jobs in the web UI. The runner never runs in Vercel, is never a publicly callable web worker, and does not autonomously discover prospects. Preflight blocks non-public, local, private-IP, high-risk hostnames, unsupported ports, and unsafe redirect destinations, but DNS can change between checks and browser navigation; this is a conservative guard, **not an isolation sandbox**. Run only on a trusted workstation and explicitly selected public business sites. Respect site restrictions and keep batches small. Some sites block automated Chromium, including the previously tested dental office. A blocked or timed-out run is **inconclusive**, not evidence of a bad website.

Each run writes `results.json` with an honest status (`measured`, `inconclusive`, `skipped` or `oversized`) and the report path. Raw reports larger than 8 MB remain on the Mac and cannot be imported using the current 8 MB uploader. The existing import code marks Chrome-extension interference and Lighthouse warnings inconclusive, and labels all local reports as *operator-supplied*. Uploaded evidence is not a PageSpeed-hosted result, a promise of production speed, or proof of customer demand. No paid plan or Supabase schema migration is needed.

To run the local guard tests alone: `node --test tests/local-audit-guard.test.mjs`. The full `npm test` includes these tests in CI.


## Site Production v0.4 · Reusable generator foundation

Command Center now separates **research**, **approved site content**, and **rendering** instead of filling a generic template and calling it a finished customer website.

- `lib/site-blueprint.ts` is the reusable, versioned representation of real copy, confirmed services, image sources, approval state, appointment link and design preferences.
- `components/site-renderer.tsx` is a portable React presentation component. It renders a photographic hero/gallery only from **explicitly approved** assets; otherwise it uses a designed typographic hero without fake photos or company facts.
- Each private demo has a **Content & photography** editor. It keeps atomic revisions via the existing Supabase RPC. No new database migration is required.
- **Source research** can be imported as candidate headings, descriptions and unapproved image references. It never publishes copied images or silently rewrites existing owner-approved text.
- `/app/api/demos/[id]/blueprint` exports a private JSON site blueprint. Exporting is not deploying; real client sites still require their own deployment, integrations, domain, asset storage, QA and client approval.

### One-business local content research (no API credits)

Use Website Intelligence to download a **fresh** approved queue containing exactly one company. In a terminal within this repository, run:

```bash
node scripts/local-site-research.mjs ~/Downloads/command-center-audit-queue.json
```

Confirm the listed business URL and type `RESEARCH`. The collector checks public website safety, reads up to five same-host public HTML pages, respects robots disallows, and saves candidate page headings plus image **URLs** at `.local-lighthouse/site-research/*.json`. It does not download image files, verify factual claims, or grant permission to display them. The collector may miss JavaScript-only galleries or websites that block automated requests.

Open that business's private Demo Studio page and use **Import research references** to select the output JSON. Content and image references then appear in the source review area. Verify claims and select appropriately licensed/owner-approved images in the editor before displaying them. A site without confirmed services, approved facts, and valid contact/appointment details cannot pass the basic publication gate.

**Next build milestone:** generate a standalone, deployable client Next.js project from the blueprint and renderer, with dedicated asset hosting, real forms/booking, approvals, visual and performance testing, and a publication/rollback process. This is not yet implemented; do not market the current internal preview as a deployed client site.
