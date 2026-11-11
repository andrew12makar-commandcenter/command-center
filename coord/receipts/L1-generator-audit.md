# L1-generator-audit

Lane: L1-generator-audit

Goal: Explain why the website generator output is poor, with a rendered synthetic example, screenshots, and a rubric other lanes can re-run. Do not edit `lib/` or `scripts/`.

## VERIFIED

Example business: Example Data Barbers, Example City, phone 555-0100, email example-data@example.org. Example data. `factStatus` is `unreviewed`. `owner_approved` was not set. `publishReady` is false. `getMatchedConceptSet` returned null. Composition `service-index`, typography `humanist`, template `universal`, sector `other`.

Commands and results, 11 Nov 2026, from the repo root, Chrome at `/usr/bin/google-chrome`:

```bash
node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test qa/generator/score-lib.test.mjs
```

8 tests, 8 pass, 0 fail.

```bash
node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON qa/generator/render-example.mjs
```

Next 16.4.0 compiled the preview and wrote the static page, then exited 1 with `SecurityFatalError` (advisory, not a compile error). The script continued because `.next/server/app/index.html` existed, started `next start` on 127.0.0.1:4327, and saved screenshots. `SiteRenderer` was called with `standalone`. The harness added the banner and `noindex`. The rendered footer is `© 2026 Example Data Barbers`.

```bash
node qa/generator/score-site.mjs qa/generator/output/example-data-barbers
node qa/generator/score-site.mjs qa/generator/output/example-data-barbers-loop
node qa/generator/score-site.mjs qa/generator/fixtures/brighton-barbers-demo
```

| Site | Score |
|---|---|
| Production renderer, Example Data Barbers | 63/100 |
| Loop HTML, same example | 74/100 |
| Brighton Barbers fixture | 92/100 |

Production check scores: heading 12, section variety 10, image alt 4, fonts 0, boilerplate 0, overflow 14, contrast 14, perf 9. JS transfer logged at 144237 bytes. No horizontal overflow at 390px. 44 contrast samples passed. Full table: `qa/generator/output/scores.json` and `docs/generator/audit.md`.

In-memory `evaluateSiteBlueprint` on a clone (not written to disk): unreviewed 78 rejected; `researched` 90 accepted; `owner_approved` 94 accepted. Visual specificity stayed 20. This did not set `owner_approved` on any saved blueprint and did not call the exporter.

Circle public preview `https://61c7713a.venu-e60.pages.dev/immersive/` returned HTTP 200, title “Circle Tavern | 3D Venue Film · Private Review”. Desktop and 390px frames were saved from the main-bar chapter after the film had advanced. GitLab tree for `andrew-makar-personal-projects-group/circle-venu` branch `feature/circle-hd-3d-motion-v2` was read (`immersive/index.html`, `immersive/experience.css`, `docs/LAYOUT.md`).

Brighton demo was taken from the uploaded `brighton-barbers-demo.tar.gz` and copied to `qa/generator/fixtures/brighton-barbers-demo/`.

## CLAIMED-but-unverified

- Lighthouse lab scores. Not run. Perf numbers are file bytes plus the Playwright transfer log.
- The Circle entrance chapter. The saved frames are the main bar, not the opening shot.
- That every composition family is as inert as `service-index`. The dead bindings and the two CSS rules were read. Only this example was rendered.

## Blockers

- `next build` on 16.4.0 exits 1 after a successful page write because of the Next.js security advisory. The render script treats a written `index.html` as success. Upgrading Next is outside this lane.

## needs-other-lane

All ten fixes in `docs/generator/audit.md` are in `lib/` or `scripts/` (renderer tokens, fonts, classification, concept imagery, CTA label, section order, disclaimer, static export, preflight gate). This lane did not edit those trees.

## Suggested next step

Point the export gate’s quality check at `qa/generator/score-site.mjs` on a rendered page, and make this example’s production score at least 92 with font-loading 14, boilerplate-copy 10, section-variety at least 12, and perf-budget 12, without setting `owner_approved` and without adding an off-trade photograph.
