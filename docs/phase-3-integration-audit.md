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

## Remaining independent gates
1. The local release candidate is not pushed, so exact-head GitHub Actions and disposable Supabase authenticated tests cannot verify the local merge result. Docker and Supabase CLI/runtime are absent locally.
2. Validate the owner-Mac runtime and inspect production RPC/schema and historical CRM orphans separately. No production migration, data changes, deployment, publication, outreach, domain purchase or merge to `main` is included in this branch integration.
3. Technical browser QA is complete for the eight fictional benchmark sites; human design review and client-specific fact/asset approval remain separate gates.

## CI configuration audit (2026-10-15)
- `.github/workflows/ci.yml` push trigger includes release branch. `typecheck-build` runs npm test, typecheck, lint, build and isolated exported-site build. `browser-qa` runs Playwright Chromium and local Lighthouse against benchmark exports.
- `.github/workflows/intake-isolated.yml` push trigger includes release branch and uses disposable Supabase CLI stack, reviewed atomic SQL candidate, test-only fault trigger, JWT/RLS/concurrency tests and signed-in Next.js import UI QA. It explicitly unsets remote Supabase credentials.
- These are **workflow source checks, not proof of successful runs** on latest phase-3 HEAD. The connected GitHub workflow-run lookup is PR-only and cannot reliably enumerate push runs; verify Actions results separately before signoff.
- The standalone export test asserts research-only assets are blocked, sensitive research notes stripped, no CRM/Supabase in exported scaffold, and no existing destination overwritten.

## Local integration and verification (2026-10-15)
- The integration worktree is `integration/release-candidate-oct14`, based on `c8d5ef7`; work remains local and unpushed.
- The board-count branch's shared filtering, hidden-test counts, filter persistence and tests are present in the release tree and its targeted integration history. The GBP branch's conservative link classification, pitch/review cautions and CRM exact-ID edit guard are present, with the release retaining staged-import recovery and stricter preservation of unchanged historical links.
- The foundation branch's dual-project tracker, active/next/blocked milestones, activity history, business-specific renderer, and clean exported-site production smoke are represented in the release tree. Its final snapshot predates current approved-media selection, generated-image disclosures, stored section ordering, staged-import recovery, later routes and CI. Its phone/booking CTA behavior was missing; the current renderer now directs the primary action to a validated booking URL, `tel:` or `mailto:` destination without guessing a country code.
- The source-level tracker includes a completed `seo-release-branch-integration` checkpoint, tied to this audit and issue #3. The Supabase-backed live roadmap was not written.
- Verification on the updated local source: `npm test` passed (232 TypeScript tests and 41 MJS tests); typecheck passed; lint passed with 0 errors and 14 existing warnings; all 8 generator benchmarks scored 100; webpack production build passed; clean standalone export installed 48 packages and built successfully.
- Full exported-site browser QA passed on all 8 fictional benchmarks at desktop, tablet and mobile: 0 blocking, 0 warning findings; no near-duplicate layout pairs. Lighthouse: performance 76–100, accessibility 98–100, best practices 100, SEO 100. Two demos scored below 90 in lab performance, so that score is not claimed as uniformly high. Human visual/client review remains pending.
- Local disposable authenticated Supabase recovery/concurrency/RLS/UI tests remain NOT RUN because Docker and Supabase CLI/runtime are absent. The previous GitHub Actions run passed only on exact `c8d5ef7`; it does not verify these local changes.
- No production database, migrations, live records, deployment, domain, publication or outreach was changed. No push or `main` merge was made.

## Semantic branch comparison against c8d5ef7
- `codex/agent-ledger-board-counts-oct14` (`b9881e2`): verified in the release tree by `lib/opportunity-board-filter.ts`, filtered count/list logic, state-preserving navigation and dedicated regression tests. Current integration history includes targeted commits for the helper and UI/docs pointers.
- `codex/gbp-evidence-guardrails-oct14` (`a7a11b6`): verified in the release tree by `lib/google-listing-link.ts`, qualification/pitch wording, import review guidance and CRM edit validation. Release recovery and unchanged legacy-value guards remain intact.
- `feature/nextjs-foundation` (`32374f8`): the tracker, activity history, industry-specific sections, direct contacts and clean exported build have been reconciled with the current renderer and safeguards. The missing functional primary contact action was restored and regression-tested. Its older snapshot was not applied wholesale because it drops or rolls back approved-media selection, generated-image disclosures, section ordering, CRM/intake safeguards, migration numbering, routes and CI coverage.
- Intake authenticated QA (`38fd925`) and recovery guard (`d637878`) are ancestors of c8d5ef7. Generator intelligence, media-context and export-validation snapshots have no additional source tree delta against c8. The prospect-intake integration branch (`61aa593`) is the PR base and is behind the release candidate. These histories did not require another cherry-pick.
- The local `integration/release-candidate-oct14` branch is based on c8d5ef7 and contains source commit `4c44117` plus the follow-up tracked export verification. It has not been pushed. The generator separates trade sector from visual template, preserves estimate-oriented trade copy, and copies `lib/business-classification.ts` into exported client projects.
- No additional package was justified. The patch uses existing Next.js, Tailwind, and Lucide dependencies.
- The latest follow-up additionally repaired the foundation branch's primary CTA and its unit coverage; full tests, typecheck, lint, generator benchmarks, main webpack build, clean export build, and eight-site responsive browser/Lighthouse suite pass on this local source.
- Local disposable authenticated Supabase testing remains unavailable: Docker and Supabase CLI/runtime are not installed. GitHub Actions isolated authenticated intake passed on exact c8d5ef7, but not on the local branch.
- Local DB verification remains unavailable because Supabase CLI and Docker are not installed. GitHub Actions isolated authenticated intake passed on exact c8d5ef7, but it does not cover the local generator/export patch. The workflow was not dispatched against c8 because that would not test the unpushed local patch, and pushing is outside the approved scope.

## Final local history-merge checkpoint (2026-10-15)
- The user authorized local history merges after the semantic audit. On `integration/release-candidate-oct14`, all three reviewed remote heads are now ancestors of `3a97c199b629e3ecb1cf5b162c17d48ebc0a5dbd` through normal merge commits:
  - `codex/agent-ledger-board-counts-oct14` at `b9881e2`, merge `15d8e5476d4b43bf459e4e88cd488e6297232b41`.
  - `codex/gbp-evidence-guardrails-oct14` at `a7a11b6`, merge `3427757282f4d061161b2ff93ebffe49047e96ed`.
  - `feature/nextjs-foundation` at `32374f8`, merge `3a97c199b629e3ecb1cf5b162c17d48ebc0a5dbd`.
- Merge conflicts were resolved in favor of newer release-candidate safeguards where the branch snapshot was older. The tested source tree is retained; historical roadmap SQL copies were not installed over the canonical numbered migrations. The functional booking/phone/email contact action has focused regression tests.
- The three merge commits add ancestry without changing the already-reviewed source tree (`3a97c19` has the same tree as source commit `a99be9e`). The local tracker status correction and this evidence update are documentation/tracker changes; they do not touch business records or the live roadmap.
- Verification on the merged source: 232 TypeScript and 41 MJS tests pass; TypeScript passes; lint has 0 errors and 14 existing warnings; webpack production build passes; generator benchmark is 8/8 at score 100; standalone export installed 48 packages in a clean folder and completed an optimized Next.js build. Responsive browser QA passed for all eight fictional sites at desktop/tablet/mobile with 0 blocking and 0 warning findings; Lighthouse scores were performance 76–100, accessibility 98–100, best practices 100 and SEO 100.
- Exact-head GitHub CI and isolated authenticated Supabase recovery/concurrency/RLS/UI verification remain unverified. Docker and Supabase CLI/runtime are absent locally; no push was made to trigger CI. Previous passing remote runs apply to ancestor `c8d5ef7`, not this merged HEAD. The local branch remains unpushed, and no main merge, production migration/write, deployment or outreach occurred.
- The roadmap source and project-status record now identify this integration as complete while keeping separate database, client, human design-review and production-readiness gates open. The canonical issue #3 is the event log for this checkpoint.

## Approved local verification rerun (2026-10-15)
- On local checkout HEAD `08554bb29b03785517669d695d9df0ff78f1d599`, `npm test` passed (232 TypeScript + 41 MJS), typecheck passed, lint passed (0 errors, 14 existing warnings), webpack production build passed, and generator benchmark passed (8/8 at score 100).
- A clean exported client install added 48 packages and its standalone Next.js production build passed.
- Responsive browser QA rebuilt the exported harness and passed all eight fixtures at desktop, tablet and mobile (24 viewports total), with zero blocking and zero warning findings. It used the already-installed Google Chrome because Playwright's bundled Chromium is not installed. Report: `/private/tmp/command-center-merged-qa-20261015/report.md`.
- Lighthouse was not rerun during this pass; the earlier Lighthouse results in this audit came from the same tested site-renderer source tree. Exact-head GitHub Actions and isolated authenticated Supabase tests remain NOT RUN. Docker/Supabase CLI are absent locally and this branch remains unpushed.

## Progress tracker audit and branch disposition (2026-10-15)
- The screenshot showing 8/31 was served by `localhost:3001`, whose running checkout is `/Users/andrewmakar/Documents/GitHub/command-center-integration-preview` at `claude-local-work-oct12` / `034d167`. It is not the release-candidate checkout. The merged release candidate is `/Users/andrewmakar/Documents/Codex/command-center-takeover-oct15` at `50aa4bd`; its authenticated dashboard rendered 10/32. Both screens showed the same connected business counts, while their source-controlled roadmap definitions differed. This explains the apparent unchanged progress and is not evidence that the three merges were omitted.
- The release candidate's source roadmap marks `seo-release-branch-integration` completed. The separate `/app/project-status` snapshot had not advanced M8 from `in_progress` despite verified local tests. It is reconciled to `ready_for_review`; exact-head hosted CI and isolated authenticated database verification remain explicit blockers.
- The status snapshot named Codex as the responsible agent, but its parser allowed only Claude and ChatGPT and silently showed Claude. The parser now accepts Codex, the tracker regression test checks the owner and M8 status, and the displayed update time uses an explicit Eastern offset. Full tests (232 TypeScript + 41 MJS), typecheck, lint (0 errors, 14 warnings), and webpack production build passed on this tracker-fix tree.
- Branch disposition is based on source and merge history, not branch names alone:
  - `codex/agent-ledger-board-counts-oct14` (`b9881e2`) is included through merge `15d8e54`; its filtered count/list logic, toggle preservation and regression tests are retained.
  - `codex/gbp-evidence-guardrails-oct14` (`a7a11b6`) is included through merge `3427757`; its conservative Maps-link identity and pitch/review safeguards are retained alongside newer staged-import recovery and legacy-value preservation.
  - `feature/nextjs-foundation` (`32374f8`) is included through merge `3a97c19`; its useful roadmap, activity, contact and site-renderer work was reconciled. The old snapshot was not overlaid because it would roll back newer media approval, section ordering, intake safeguards, routes and CI coverage.
- The practical lesson is to keep one named preview URL tied to one exact checkout and commit. The local roadmap sidebar is partly source-defined and partly read from Supabase; it does not synchronize to an older running server when a branch changes. GitHub issue #3 is a manual event log, not live sync. Report code, database, hosted CI and client-review status separately.
- The exact three branch heads are ancestors of `50aa4bd`. Local source verification passed as recorded above; this does not close the hosted exact-head CI or isolated authenticated database gates. No live business records, schema or production migration were changed in this audit.
