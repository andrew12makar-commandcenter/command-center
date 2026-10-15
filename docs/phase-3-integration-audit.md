# Phase 3 integration reconciliation

Verified from GitHub branch file contents on 2026-10-15. This is a repository audit, not a live Mac or production database test.

## Canonical baseline
- Branch: `integration/release-candidate-oct14`.
- Verified release-candidate head: `c8d5ef7b55cd984a0f2f96cc06c24a57909282e7`.
- GitHub Actions run `38681092310` passed full CI on that exact SHA, including tests, typecheck, lint, production build, clean client export, Chromium browser QA, and local Lighthouse.
- GitHub Actions run `38681092336` passed isolated authenticated intake on that exact SHA, including disposable Supabase, concurrency/fault recovery/RLS checks, signed-in Next.js import UI QA, and cleanup.
- These remote results verify the published `c8d5ef7` branch only. They do not cover the uncommitted local generator correction described below.

## Historical roadmap SQL: resolved as a source preservation question
- Historical `feature/nextjs-foundation:supabase/migrations/0004_project_roadmap.sql` archived at `docs/historical-roadmap-migrations/0004_project_roadmap.sql`.
- Historical `feature/nextjs-foundation:supabase/migrations/0005_roadmap_execution_log.sql` archived at `docs/historical-roadmap-migrations/0005_roadmap_execution_log.sql`.
- Canonical branch already contains the correctly numbered `supabase/migrations/0004_generator_intelligence.sql`, `0005_project_roadmap.sql`, and `0006_roadmap_execution_log.sql`.
- The archived SQL is **not** to be applied. No migration was executed in this phase. Do not assume production schema is current without independent inspection.

## Divergent branch decisions
- `feature/nextjs-foundation`: newer renderer in `components/site-renderer.tsx` uses `site-industry-sections`, media selection and stored section ordering. Do **not** overwrite it with the older monolithic renderer.
- `feature/nextjs-foundation`: `scripts/export-client-site.mjs` and `scripts/smoke-client-export.mjs` differ; current export smoke fixture uses `generator-benchmarks`. Retain newer baseline, then validate clean exported production build on exact combined HEAD.
- `codex/gbp-evidence-guardrails-oct14`: current `lib/google-listing-link.ts` adds `exactGoogleListingUrl` and `editableCrmListingUrl`, with corresponding tests. Preserve strict listing-ID validation and unchanged historical CRM values.
- `codex/agent-ledger-board-counts-oct14`: tracked UI/code files were previously found blob-identical; `docs/prospect-discovery-status.json` differs and currently reports stale M8 testing pending. Reconcile evidence with issue #3 before editing or claiming milestones.

## Outstanding before Phase 4
1. Audit remaining divergent UI and export behavior against expected requirements, without wholesale historical branch merges.
2. Reconcile `docs/prospect-discovery-status.json` against the ledger and exact-head CI, retaining historical results.
3. Run exact-head tests, typecheck, lint, production build, standalone export, browser/Lighthouse checks, and disposable authenticated database tests. A prior passing ancestor does not prove the new HEAD passes.
4. Validate on owner's Mac separately; this GitHub connector does not inspect localhost or live Supabase.
5. No `main` merge, migration, deployment, publish, prospect contact or roadmap completion without explicit approval and evidence.

## CI configuration audit (2026-10-15)
- `.github/workflows/ci.yml` push trigger includes release branch. `typecheck-build` runs npm test, typecheck, lint, build and isolated exported-site build. `browser-qa` runs Playwright Chromium and local Lighthouse against benchmark exports.
- `.github/workflows/intake-isolated.yml` push trigger includes release branch and uses disposable Supabase CLI stack, reviewed atomic SQL candidate, test-only fault trigger, JWT/RLS/concurrency tests and signed-in Next.js import UI QA. It explicitly unsets remote Supabase credentials.
- These are **workflow source checks, not proof of successful runs** on latest phase-3 HEAD. The connected GitHub workflow-run lookup is PR-only and cannot reliably enumerate push runs; verify Actions results separately before signoff.
- The standalone export test asserts research-only assets are blocked, sensitive research notes stripped, no CRM/Supabase in exported scaffold, and no existing destination overwritten.

## Takeover patch review (2026-10-15)
- The isolated local copy identified a real mismatch: plumbing and general contractors were being assigned landscaping imagery/copy by the generator benchmark and demo pipeline.
- An uncommitted local patch now separates the trade sector from visual template selection, uses estimate-oriented calls to action and neutral trade presentation, and adds regression coverage. Landscaping still receives its specialized visual template.
- Local verification on the patch: full test suite passed (270 tests), typecheck passed, lint passed with 14 existing warnings and 0 errors, generator benchmark passed 8/8 fixtures at score 100, and a webpack production build completed.
- The default local Turbopack build could not bind a port under the sandbox restriction. The clean-install export smoke and targeted holdout-plumbing browser QA remained silent during temporary dependency installation and were stopped; no local result is claimed. The exact-c8 remote CI did pass export and browser/Lighthouse checks, but that is not evidence for this uncommitted patch.
- No branch was merged or pushed. The owner Mac checkout, production Supabase, live site, and deployment were not inspected.
- Read-only owner-Mac UI check: `http://localhost:3001/app` and `/app/roadmap` loaded in the signed-in browser. `/app/project-status` returned a 404, although the current repository build lists that route. Treat the running Mac server as stale or different until its checkout/process is verified; no data or tracker status was changed.

## Semantic branch comparison against c8d5ef7
- `codex/agent-ledger-board-counts-oct14` (`b9881e2`): the release candidate already contains the shared Opportunity Board filtering, test visibility preservation and regression tests. No board source transplant was needed.
- `codex/gbp-evidence-guardrails-oct14` (`a7a11b6`): its conservative listing-link classification is represented in the release candidate. The c8 tree retains the additional exact-listing URL and CRM edit guards, plus the newer staged-import recovery controls that the older branch snapshot removes. The release version was retained.
- `feature/nextjs-foundation` (`32374f8`): its older renderer and roadmap/sidebar differ substantially. Applying them wholesale would remove current site-media selection, reviewed-business sections, roadmap evidence links and several newer routes or safeguards. No wholesale merge was made; the current renderer remains the integration base.
- Intake authenticated QA (`38fd925`) and recovery guard (`d637878`) are ancestors of c8d5ef7. Generator intelligence, media-context and export-validation snapshots have no additional source tree delta against c8. The prospect-intake integration branch (`61aa593`) is the PR base and is behind the release candidate. These histories did not require another cherry-pick.
- `codex/takeover-oct15` remains a local work branch based on c8d5ef7. The local patch separates trade sector from visual template, preserves estimate-oriented trade copy, and gives plumbing a quiet trade-safe presentation. It also fixes an export manifest omission found by the holdout preview build: `lib/business-classification.ts` is now copied into exported client projects.
- No additional package was justified. The patch uses existing Next.js, Tailwind, and Lucide dependencies.
- Final code checks after the export fix: 270 tests passed, typecheck passed, lint had 0 errors and 14 existing warnings, webpack production build passed, and standalone export build passed using the installed dependency tree. The registry-backed clean install was not exercised because required package metadata was not cached offline.
- Targeted responsive browser/Lighthouse QA completed on the exported plumbing holdout after the export fixes: desktop 1440×900, tablet 834×1112 and mobile 390×844 all had 0 blocking and 0 warning findings. Lighthouse measured performance 100, accessibility 98, best practices 100 and SEO 100. This is one trade holdout, not full manual design approval across all target businesses.
- Local DB verification remains unavailable because Supabase CLI and Docker are not installed. GitHub Actions isolated authenticated intake passed on exact c8d5ef7, but it does not cover the local generator/export patch.
