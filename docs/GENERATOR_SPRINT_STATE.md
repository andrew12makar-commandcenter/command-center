# Generator development sprint state

This is the compact recovery checkpoint for continued development of the **local-business website generator**. Historical details belong in Git commits. No model weights were trained.

## Safe source and boundaries
- Remote branch: `codex/generator-intelligence-checkpoints-oct12`, derived from the validated checkpoint `27acb2ee7a0a376adc83c5433f335f15cb1405c3`.
- Protected: original Mac `command-center`, local backup and stash, `claude-local-work-oct12`, `integration/claude-roadmap-oct12`, `main`, production Supabase.
- Only edit this feature branch; do not merge/deploy or apply migrations without separate validation and authority.

## Verified checkpoint 1: feedback direction
- Commits: `da9794f` interpreter, `faa044a` independent regression tests, `adf1c13` branch CI enablement.
- Fixed: negative hierarchy statements no longer promote an expressly rejected first section; buried services still move upward. Absolute 'no photos' becomes a hard none constraint, unlike 'don't add more photos'. Improved spacing language includes whitespace shortage, jammed sections, and tighter layout requests.
- Evidence: [GitHub Actions run 38209922935](https://github.com/andrew12makar-commandcenter/command-center/actions/runs/38209922935) **passed** tests, TypeScript, production build, and standalone client export build.
- Unmeasured: genuine unfamiliar-feedback recall, visual quality, real users. Never present these changes as model training or claim recall improved without a separately preserved holdout.

## Verified checkpoint 2: publication preflight safety and honest quality scope
- Commits: `f675f00` preflight hardening, `70fa3b0` URL-regex correction, `7b751f0` regression tests.
- The evaluator now rejects unsafe or credential-bearing source/booking destinations, including local/private host patterns, even when other contact methods are present. Existing upstream URL sanitation remains intact.
- Quality records identify the 0–100 number as **blueprint preflight** and explicitly mark rendered visual quality, runtime performance and client acceptance **unverified**. This does not fix the benchmark's limited visual discrimination.
- Evidence: [GitHub Actions run 38210198295](https://github.com/andrew12makar-commandcenter/command-center/actions/runs/38210198295) **passed** unit tests, TypeScript, main build, and cold-install standalone client export production build.
- Latest **tested feature commit**: `7b751f0c43d5c5ff84fabfa9a2402f6f7dbccb7a`. Later documentation-only commits do not replace this test evidence.

## Verified checkpoint 3: feedback-to-composition regression
- Commit: `fb830c182d183d91d3a6012a57a4c41076ce3d47` adds independent end-to-end tests from notes → interpreted signals → resolved preferences → modified candidate → composed page plan.
- Covered effects: image prohibition leaves zero section imagery even when generated images are available; rejected story-first changes the first body section; buried services move ahead; spacing instructions change actual pixel spacing.
- Evidence: [GitHub Actions run 38210413994](https://github.com/andrew12makar-commandcenter/command-center/actions/runs/38210413994) **passed** all tests, TypeScript, main production build and cold-install standalone client build.
- Important limitation: `composePage` is the deterministic feedback-loop page planner. This test does **not** establish that the production Next.js `SiteRenderer` displays every feedback change correctly. Real screenshot/reviewer evaluation remains a future task.
- Latest **verified code commit**: `fb830c182d183d91d3a6012a57a4c41076ce3d47`.

## Verified checkpoint 4: production customer-site layout wiring
- Tested feature head: `c8878802fbebba8f9c7c105d941170712dfb7806`.
- Live `SiteRenderer` now honors blueprint `sectionOrder`, keeping actual DOM and keyboard reading order consistent rather than styling sections with CSS visual-only order.
- A pure `lib/site-section-order.ts` handles allowed existing sections, duplicates and missing modules without inventing content. Unsupported proof/trust placeholders remain unsupported.
- `candidateToPreferences` and `planGeneration` now carry offer/story/action-first hierarchy into `generationSpec` and then the actual site's blueprint. `imageTreatment='minimal'` suppresses available approved and generated photos in the client renderer.
- Standalone export bundles the section-order helper. Regression tests: `tests/site-section-order.test.ts` and `tests/generator-production-order.test.ts`.
- Evidence: [GitHub Actions run 38211358242](https://github.com/andrew12makar-commandcenter/command-center/actions/runs/38211358242) **passed** all repository tests, TypeScript, production build, and cold-install exported customer-site production build.
- Still unverified: browser screenshots and human design ratings, live Supabase feedback action (the loop adapters exist, but `app/app/demos/feedback-actions.ts` still uses the older preference derivation), and production DB migrations. DO NOT claim feedback is automatically applied to live user accounts yet.

## Evaluation baseline (not a production claim)
- Prior documented fictional benchmark: rules+search holdout agreement 0.625; baseline 0.292; cross-validation 0.652; unfamiliar-style interpreter recall 0.167. Source: `docs/feedback-loop.md`.
- Six generator cases scored 100/100 on permissive *structural preflight*; that is not a measured visual-quality score.
- External client content, rights, real browsers, and production database state are still unverified in this checkpoint.

## Current objective
Next task: validate actual production renderer in a running browser across medical, landscaping, and professional-services demos, then safely wire saved reviews to structured feedback rules using org-scoped Supabase data once migration state is verified. Do not claim the private authenticated user flow has been tested.

## Recovery instructions
1. Inspect this file, check `git status` and branch; do not reset original Mac work.
2. Read only relevant `app/app/demos/feedback-actions.ts`, `lib/generator-loop/integration.ts`, and `components/site-renderer.tsx`.
3. Validate browser output before enabling the live feedback adapter; add a small org-scoped integration patch with tests, then run CI.
4. Update this checkpoint with the latest verified commit and next task.
