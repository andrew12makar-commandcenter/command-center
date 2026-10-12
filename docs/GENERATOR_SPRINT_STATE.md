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

## Verified checkpoint 5: cross-industry design systems
- Latest verified feature commit `4fe640d21e7812f7c4908d2f69f8b548d074024e` (includes renderer integration fix); earlier code commits `f4ff02c`, `c6a1366`, `0db40da`, `9efbfa9`, `b61cb7c`.
- Added `lib/site-presentation.ts` and `components/site-industry-sections.tsx` to select distinct, content-appropriate service presentation systems for clinical, landscaping, and professional services. A narrow generic three-card process grid was replaced by a full-width responsive journey section with industry-specific, non-fabricated guidance.
- `components/site-renderer.tsx` now uses these sections. `scripts/export-client-site.mjs` includes their two dependencies in independent customer projects.
- Added `tests/site-presentation.test.ts` to cover multiple compositions per industry, cross-industry variance, and sparse-service fallbacks.
- Evidence: [GitHub Actions run 38220052264](https://github.com/andrew12makar-commandcenter/command-center/actions/runs/38220052264) PASSED unit tests, typecheck, main build and standalone client export production build. An earlier intermediate commit briefly failed typecheck due to orphan JSX and was corrected before this verified checkpoint.
- Important: no browser screenshot comparison of the new output has yet been made; quality has not been human-approved. The benchmark still scores structural preflight only.

## Verified checkpoint 6: original-site reference and real multi-vertical sections
- **Latest verified code**: `5fe51f2f089021350317354537086144368075d6`.
- **Full CI verification**: [GitHub Actions 38221409888](https://github.com/andrew12makar-commandcenter/command-center/actions/runs/38221409888) PASS: unit tests, typecheck, main production build and independent client-site cold-install production build. Earlier intermediate commits briefly failed due missing old JSX removal and regex escaping; both corrected in tested head.
- **Layout foundation**: `lib/site-presentation.ts` and `components/site-industry-sections.tsx` supply distinct clinical, landscaping and professional layouts for hero, service sections, journeys and gallery. Renderer wires them in, and standalone exporter includes necessary files. Narrow nested step cards removed.
- **Original-site research**: `scripts/site-candidates.mjs` identifies theme-color metadata, potential hero/logo/gallery images, still marked `reference_only`. `lib/site-blueprint.ts` sanitizes themeColor in bounded researchPages. `app/app/demos/feedback-actions.ts` preserves these references from bounded same-domain scanning and imported site research.
- **Source-driven planning**: `lib/source-redesign-reference.ts` compiles source URL hosts, inspected color cues, reviewed site modules and image rights into layout and media recommendations plus business-type-specific AI conceptual image briefs. `app/app/demos/[id]/page.tsx` displays reference and rights state. The apply-reviewed-research action can use these recommendations on a new revision **only if there is no saved explicit design feedback**.
- Tests added: `tests/site-presentation.test.ts`, `tests/source-redesign-reference.test.ts`, `tests/source-site-hints.test.mjs`.
- **Limitations**: current fixed concept JPEG pool (nine files) remains. No on-demand AI image generation, automatic design cloning, live real-world rights confirmation, browser screenshot QA, or client approval occurred. Research captures HTML metadata/structure, not pixel-accurate visual style or entire CSS. All business imagery from a website remains unapproved until authorization and review. No Supabase migrations or live production deployment were performed.

## Verified checkpoint 7: proposal specificity and subtype-safe imagery
- **Latest verified code commit:** `7ac4e681b06be7601854646c3cfbc6b9daa10a66`.
- **Full GitHub Actions evidence:** [run 38224385471](https://github.com/andrew12makar-commandcenter/command-center/actions/runs/38224385471) PASSED tests, TypeScript, main production build and clean standalone exported-site build.
- `lib/concept-imagery.ts`: `getMatchedConceptSet()` now selects old static AI concepts only for matching business subtype, failing closed for veterinary, primary-care, plumbers, bookstore and unknown categories rather than presenting a dental chair or landscaping as the business's image. Applied in benchmark gallery, authenticated Demo Studio preview and full-screen preview; regression tests added.
- `lib/business-specific-copy.ts`: untouched generic generated headline/description now adapt from the actual listed service names, business name and recorded city. Human-authored headlines are preserved; unreviewed details carry a confirmation warning. Connected in `lib/site-blueprint.ts`, included in cold standalone exports, regression-tested.
- `lib/reviewed-business-features.ts`: only operator-reviewed, meaningful, source-linked company website insights can replace the repetitive three-card process section with source-linked business details; candidates, generic labels and unsafe URLs are excluded. Connected through `components/site-industry-sections.tsx` and standalone export.
- `lib/source-redesign-reference.ts`: business image *briefs* are now specialty-specific for veterinary, dental, primary care, other home services and bookstores. All such visuals remain **not generated** until an actual licensed provider/review pipeline is added.
- New tests: `tests/business-specific-copy.test.ts`, `tests/reviewed-business-features.test.ts`, subtype coverage in `tests/concept-imagery.test.ts` and `tests/source-redesign-reference.test.ts`. One intermediate test failed due a prompt wording assertion and was corrected before the green CI above.
- **Not accomplished**: direct Google Business Profile/Places photo ingestion, licensing or attribution clearance; bulk original-site photo imports with commercial rights; on-demand AI image rendering; automated business-specific visual compositions from screenshots; browser-based visual QA. Public availability is not a license. The legacy nine static concept JPEGs remain for matching categories only. Private Supabase, backups and original branches unchanged.

## Verified checkpoint 8: visible sprint state and per-asset rights decisions
- Commits: `3f95a44` makes the website sprint visible in the Command Center sidebar and `/app/roadmap`; `b3b02ef` adds a per-image rights queue.
- The roadmap now tracks business facts, source-media provenance, rights review, opt-in AI concepts, design variance, motion QA, responsive screenshot QA, and the final client-demo gate as distinct milestones. The AI-media milestone is explicitly blocked until a provider, budget and paid use are approved.
- Each collected image remains `reference_only` until a human records a specific evidence note and independently confirms display permission. An operator can reject an item without approving it. Approved, pending and rejected counts are visible; source URLs, review notes and timestamps remain attached to the private revision. Rejected images never render.
- No migration was added or applied. Roadmap baselines remain source-controlled and existing organization-scoped Supabase overrides still take precedence when migrations 0005 and 0006 are already installed.
- Local verification: 148 TypeScript tests and 15 JavaScript tests passed, TypeScript passed, focused lint passed, the main Next.js production build passed with webpack, and `scripts/smoke-client-export.mjs` completed a clean install and production build of the isolated customer site.
- Browser limitation: the available localhost benchmark route redirected to the login screen, so no authenticated desktop/mobile screenshot or human visual-quality claim was recorded in this checkpoint. GitHub CI must still verify the pushed branch with its default build path.

## Verified checkpoint 9: zero-spend external media gate
- `lib/concept-media-generation.ts` defines provider-neutral adapters for future image-generation or licensed-library services, but deliberately performs no network request and stores no asset.
- A provider must be configured, generation must be enabled, a specific approval reference must be recorded, and image-count and cost ceilings must pass before a plan can become ready. Invalid estimates and estimates above the approved ceiling fail closed.
- Demo Studio visibly reports the current provider gate as blocked, confirms that no external request was made and `$0` was spent, and selects either the existing disclosed static concepts or a typographic fallback.
- Verification: 151 TypeScript tests and 15 JavaScript tests passed, TypeScript passed, focused lint passed, and the main Next.js production build passed with webpack. No API, credit, deployment, database migration or production data was used.

## Checkpoint 10: browser QA infrastructure (Playwright + axe + local Lighthouse)
- `npm run qa:browser` (add `--lighthouse` for lab scores) exports every benchmark through the SAME client export gate (`exportReviewHarness` in `scripts/export-client-site.mjs`) into one Next.js harness, production-builds it, and drives Chromium at 1440, 834 and 390px. Output: `artifacts/browser-qa/<run>/` with first-screen and full-page screenshots, `report.json`, `report.md`, and an `index.html` contact sheet. Exit 1 on any blocking technical defect.
- Checks: horizontal overflow, text clipped by any container, overlapping text, broken/upscaled images, broken anchors, header-nav click-through (including the mobile menu), H1/brand/action in first screen, console and runtime errors, failed requests, axe WCAG 2.2 AA, reduced-motion (no running animation, nothing transparent), and scroll-reveal content left faded. A layout-repetition signal compares structure and first-screen luminance across sites.
- Benchmarks now cover 8 cases incl. new plumbing (`holdout-plumbing`) and restaurant (`holdout-restaurant`) fixtures.
- Defects the first real run found and this checkpoint fixed: (1) **scroll reveals never tracked scrolling**: the `overflow-hidden` site wrapper was the scroll container for CSS `view()` timelines, so text sat at a fixed partial opacity; now `overflow-clip`, and whole sections are no longer view-animated. (2) **Exported sites ignored the subtype image safeguard** (plumber got a landscaping garden photo); exports now use `getMatchedConceptSet`, and blueprints carry the CRM `category`. (3) 15 serious axe colour-contrast failures; muted/eyebrow colours now pass 4.5:1 on all theme surfaces. (4) No navigation below 768px; added a no-JS `<details>` menu. (5) "Practice" nav/label shown to plumbers and restaurants. (6) Mid-sentence title case in generated copy ("explore Leak and fixture repair"). (7) 20px phone/email tap targets.
- Local evidence: 0 blocking, 16 warnings (10px uppercase labels on mobile) across 8 sites × 3 widths; Lighthouse lab accessibility 98–100. 180 unit tests, typecheck, build and standalone export build pass.
- NOT established: design quality. Screenshots show technically clean but visually plain, typographic-heavy pages, and several categories now have no imagery because no rights-cleared, trade-appropriate media exists. Human review per `docs/VISUAL_REVIEW_RUBRIC.md` is still required.
- Library decisions: `docs/OPEN_SOURCE_INTEGRATION_DECISIONS.md`.

## Evaluation baseline (not a production claim)
- Prior documented fictional benchmark: rules+search holdout agreement 0.625; baseline 0.292; cross-validation 0.652; unfamiliar-style interpreter recall 0.167. Source: `docs/feedback-loop.md`.
- Six generator cases scored 100/100 on permissive *structural preflight*; that is not a measured visual-quality score.
- External client content, rights, real browsers, and production database state are still unverified in this checkpoint.

## Current objective
Confirm Checkpoint 10 in GitHub CI (`browser-qa` job + uploaded screenshots), then: Checkpoint 13 (Cheerio-based Website Intelligence Brief inside the existing bounded fetcher), Checkpoint 11 (Overture Places + DuckDB discovery staged outside the CRM). Every generator change from now on must be checked with `npm run qa:browser` and looked at, not only unit-tested.

## Recovery instructions
1. Inspect this file, check `git status` and branch; do not reset original Mac work.
2. Read only relevant `lib/concept-imagery.ts`, `lib/business-specific-copy.ts`, `lib/reviewed-business-features.ts`, `components/site-industry-sections.tsx` and `lib/source-redesign-reference.ts`.
3. Inspect actual browser output on desktop/mobile; avoid speculative template changes. Next checkpoint should implement a defensible provider photo/reference intake with rights and provenance, then run CI.
4. Update this checkpoint with the latest verified commit and next task.
