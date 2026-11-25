# Prospect Discovery and lead-intake integration verification

**October 14, 2026 · agent: ChatGPT · status: in progress, NOT RELEASE-READY**

Canonical ledger: https://github.com/andrew12makar-commandcenter/command-center/issues/3
Isolated integration branch: `integration/prospect-intake-generator-oct14` (not `main`).

## Preservation and inclusion
- M6 scoring / discovery baseline: `codex/generator-intelligence-checkpoints-oct12` at `41adf280`. Parent of the new integration branch via generator scope.
- Opportunity Board and cross-agent tracker: `codex/agent-ledger-board-counts-oct14` at `b9881e2`. Its eight non-CI changed files are **byte-for-byte identical by Git blob SHA** in the integration branch, including the five board regression tests and the tracked JSON snapshot.
- GBP evidence guardrails: `codex/gbp-evidence-guardrails-oct14` at `a7a11b6`. Five changed non-CI files remain blob-identical; `lib/google-listing-link.ts` and `tests/google-listing-link.test.ts` are intentionally extended with import safeguards.
- Generator role-safe media: `codex/generator-media-context-oct14` at `5fd2cf4` after fixing the failed workflow. Seven generator/media/export files are **blob-identical** in the integration branch. The workflow and status documents are combined separately.
- Older preserved branches: `claude-local-work-oct12`, `codex/generator-validation-oct12`, `integration/claude-roadmap-oct12` are ancestors of M6 based on Git comparisons, not deleted. `feature/nextjs-foundation` diverges (9 commits ahead of M6, 122 behind); **do not merge it blindly**. M6/integration already have larger, evolved versions of its roadmap/sidebar/export modules. Exact semantic equivalence of all nine old commits remains a separate review item.
- Because this integration was assembled via scoped file copies, the distinct Board/GBP commit ancestry is not merged into its DAG. **Source branches remain intact and auditable.** A conflict-aware history merge requires separate validation.

## Source and regression findings
- Confirmed generator failure: Actions run 38625679812 had 202 passing and 3 failing TS tests (stale `cursor` in `composePage`). Export-only browser QA build failed because its explicit copy list omitted `lib/site-media-selection.ts`. Corrected on the generator branch in `26ea191` and `0775eaa`. Lint added to CI in `5fd2cf4`. **Post-fix results are not yet independently observed.**
- Prospect Discovery staged scans collect all CRM/staging pages before deduplication; use source IDs and street-level location keys. Existing tests cover >1,000 records and fail closed on truncated/failed pagination.
- Board filter and stage tile counts use one pool and exclude test campaigns by default. GBP search URL is not a listing identity. The combined branch has a new cross-module regression test `tests/prospect-intake-combined.test.ts`.
- **New intake defect fixed on integration only:** a discovery search area was being copied into the CRM `service_area` field. Only explicitly sourced service-area evidence is now eligible; `tests/lead-identity.test.ts` was updated.
- **New intake evidence guard:** a search/ambiguous Maps link is retained in staged source data, but not promoted to CRM `google_business_url`; only a listing-specific ID URL can be recorded there. Added `exactGoogleListingUrl` and tests. Listing ID does not confirm business identity or ownership.
- **Transaction blocker:** `approveImportedRowImpl` inserts a CRM business, then source evidence, then updates the staging row in separate Supabase calls. If later steps fail, a partially imported record can remain. There is no proven atomic transaction/rollback. Do not certify live imports until this is addressed or an independently verified recovery protocol exists. Do not apply new migrations without owner authorization.

## Test evidence: do not promote unverified claims
- Historical M6 agent report: 199 TS + 41 MJS tests, typecheck/lint/build and signed-in localhost QA. This belongs to M6 at `e9d01f7`, **not** to the combined branch.
- CI `38625679812` on generator scope: **failed** as described above.
- **Integrated branch `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, export smoke, static site browser QA:** CI branch trigger configured, results **NOT independently confirmed** in current session. The connected GitHub workflow tool lists jobs when a specific run ID is known, but does not discover push-triggered run IDs by commit.
- **Authenticated intake E2E:** NOT RUN, no access to Mac localhost or signed-in Supabase environment. Static export browser QA does **not** exercise admin lead import actions, CRM writes, authenticated filters, or live dedupe; do not call it intake E2E.
- **Existing live records:** not inspected or changed this session. The older report of five Brighton prospects and three draft demos remains historical agent evidence only.

## Verification gate before considering any merge or launch
1. In an isolated checkout of the integrated branch, run `npm install --no-audit --no-fund`; `npm test`; `npm run typecheck`; `npm run lint`; `npm run build`; `node scripts/smoke-client-export.mjs`; `node scripts/browser-qa/run.mjs --lighthouse --out artifacts/browser-qa/integration`. Capture exact exit codes and logs.
2. Use a **disposable, separate** test organization/database or fully read-only authenticated session for the intake UI. Check campaign switch/filter and provenance, staged counts, duplicate warnings across >1,000 records, test toggle, manual review, pending-row guards, listing search-vs-ID labels, score lane attribution, board stages, pitch brief, and drafted demo. Do not create actual new leads in production to “test” importing.
3. Independently verify the entire import transaction / partial-failure recovery. Do not assume the separate writes are atomic.
4. Review old `feature/nextjs-foundation` semantic differences and audit branch heads again before a conflict-aware merge.
5. Obtain owner permission before merging into `main`, PR, deploying, publishing, outreach, paid APIs, or migration 0008. No such actions were taken here.

**Mac reminder:** This isolated GitHub branch is not your running localhost app. Current sidebar, roadmap and intake UI will still reflect the checkout on your Mac until explicitly updated.
