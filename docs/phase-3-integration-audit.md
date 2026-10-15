# Phase 3 integration reconciliation

Verified from GitHub branch file contents on 2026-10-15. This is a repository audit, not a live Mac or production database test.

## Canonical baseline
- Branch: `integration/release-candidate-oct14`.
- Previous verified CI baseline: `da817a99eccec523c8ce364180242780ff556462` (see ledger issue #3 and GitHub Actions).
- Two subsequent documentation-only preservation commits: `27b2e2ec18be8a104d55cee9536e43cbb1e50df7`, `17da2cccf124b64c9a6b52ea3cbfc804c8f61d8e`. Exact-head CI after these commits has **not** been confirmed.

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
