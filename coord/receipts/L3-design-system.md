# L3-design-system

## Goal

A reusable section and design-token library for internal small-business concept sites (barber, produce market, convenience store, skin care, deli, hair studio), with a static gallery, screenshots, and unit tests. Not wired into the generator.

## VERIFIED

`node --experimental-strip-types qa/design-system/build-preview.ts`

- Wrote `/workspace/qa/design-system/preview.html` (68324 bytes).
- Node printed `MODULE_TYPELESS_PACKAGE_JSON` because the repo `package.json` has no `"type": "module"`. The same warning appears on existing `tests/*.test.ts` runs. `package.json` was not changed.

`node --experimental-strip-types --test tests/design-system.test.ts`

- 14 tests, 14 pass, 0 fail, 0 skipped. `duration_ms` 145.805839.
- Covers contrast of every theme text pair, missing prices (`to confirm`, supplied prices copied through), empty menus, reviews omitted without quote+author+source, unknown hours/location, gallery alt and unsafe `src`, `javascript:` links dropped, footer disclaimer, noindex, one `h1`, no `<script>`, embed heading demotion, and byte-for-byte equality of `qa/design-system/preview.html` with `buildPreviewHtml()`.

`node qa/design-system/capture-screenshots.mjs` (system Google Chrome 157 headless, DevTools protocol)

- Desktop viewport 1440: `scrollWidth` 1440, `overflow` 0, `scrollHeight` 21356, full-page capture height 21356 (`clipped: false`).
- 390 viewport: `scrollWidth` 390, `overflow` 0, `scrollHeight` 28457, full-page capture height 28457 (`clipped: false`).
- Both widths: `imagesWithoutAlt` 0, `externalRequests` [], Fraunces and Source Sans 3 `status: "loaded"`.
- Barber hero computed style: color `rgb(28, 22, 18)`, opacity `1`, font-family Fraunces, weight 560. Desktop size 80px. 390px size 42.9px.
- Files: `qa/design-system/screenshots/desktop.png`, `desktop-hero.png`, `mobile-390.png`, `mobile-390-hero.png`.

`npx --yes -p typescript@5.9.3 tsc --noEmit --strict --target ES2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions --skipLibCheck` on `lib/design-system/*.ts`, `qa/design-system/*.ts`, and `tests/design-system.test.ts`

- No diagnostics were printed for `lib/design-system/*.ts`.
- `qa/design-system/build-preview.ts` and `tests/design-system.test.ts` reported missing `node:fs` / `node:test` types and `import.meta` under `nodenext`. That command did not use the repo `tsconfig.json` (`module: esnext`, `moduleResolution: bundler`) and `@types/node` is not installed here.

Close-up inspection during capture (hero at 1440 and 390, mobile service rows, booking band, attributed reviews, missing-data blocks, produce-market hero) showed the internal disclaimer, example-data labels, a missing price rendered as “to confirm”, an empty review input rendering nothing, and category colors changing with the theme.

## CLAIMED-but-unverified

- `npm test`, `npm run typecheck`, and `npm run lint` for the whole repo were not run. `node_modules` is not installed in this environment (no local `typescript`, `eslint`, or Playwright).
- `@axe-core/playwright` was not run.
- The final full-page PNGs include a late CSS edit (`align-items: start` on the hours grid, deli menu dotted rule removed). Those two rules were not re-opened as a separate crop after the final capture. The hero close-ups were re-captured after that edit and match the earlier inspection.

## Blockers

None inside this lane.

## needs-other-lane

- Generator / renderer / exporter lane: import `lib/design-system/index.ts` (`renderSite`, `renderSiteFragment`, `renderDesignSystemCss`, and the section functions). This MR does not edit `components/`, `lib/generator-loop/`, `lib/skill-packs/`, or `scripts/`.
- Pass only known facts. Leave prices, hours, addresses, and reviews null when they are unknown. Do not invent them before calling the library.
- Keep the existing owner-approval gate in the exporter. This library always prints `Internal concept, not endorsed by the business` and `noindex`. It has no flag that removes either, and it does not set an approval field.
- Ship `lib/design-system/fonts/` with the page and set `fontBase` to a relative path. Remote font bases throw.

## Suggested next step

Map a researched business into `DesignSite` and render it with `renderSite` for an internal export. API notes are in `lib/design-system/README.md`.
