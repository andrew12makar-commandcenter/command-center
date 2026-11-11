# L11 renderer

Lane: L11
Goal: Make the customer renderer use the design-system document (`renderSite`) so an internal concept is a static HTML page with the design tokens, sections, disclaimer, and noindex. Draft only. Nothing was merged, deployed, or migrated.

## What changed

- `components/site-design-document.ts` maps a blueprint onto `DesignSite` and calls `renderSite`. It does not reimplement the sections.
- `components/site-renderer.tsx` loads that same document in an iframe. The document has no `<script>`.
- Missing prices, hours, services, phone, email, and about text stay `to confirm`. Reviews are omitted unless quote, author, and source are all present.
- A typographic monogram (initials from the business name) fills the hero when there is no photo. The empty second column is collapsed when there is neither a photo nor a mark.
- Appended CSS sets `body { margin: 0 }`, moves scroll padding to `html`, and gives text links a theme color. Composition names set `data-composition` and change the hero or service list.
- `lib/site-blueprint.ts` stores the exact disclaimer sentence and `noindex: true`. It does not set `owner_approved`.
- `lib/site-presentation.ts` reads `classifyIndustry().line` when that field exists (draft MR !7). Until that branch is merged, the same barber/salon/produce/deli/convenience words are recognized locally. Those lines use `shop-path` instead of Discover / Discuss / Move forward. The wired page does not render that journey at all.
- Skill-pack tokens and region slots are applied only when the pack's block checks pass and the pack does not contain `owner_approved`. Slot text stays `to confirm`.

## Brighton Barbers facts

Confirmed and rendered: the name **Brighton Barbers** and the street **8 Chestnut Hill Ave**. Everything else renders `to confirm`. No phone, hours, prices, services, reviews, booking URL, city, state, or ZIP were added. No fact was taken from another business or from the Booksy price table in the audit fixture.

## Design-review notes (advisory)

Adopted:

- Wire through `renderSite`, not a fragment inside the Next shell. The scored document has 0 bytes of JavaScript.
- Score a real `renderSite` page before and after, with both font files copied beside the HTML.
- Keep heading hierarchy, mobile overflow, and contrast. Measured again: 12, 14, and 14 on the wired example and on Brighton.
- Monogram, and collapse the hero grid when there is no photo and no mark.
- `body { margin: 0 }` and scroll-padding on `html`.
- One hero action. The generator's "Request information" label is not copied. A button is rendered only when a non-boilerplate action and a real URL are both present.
- Category fallback lives in the wiring layer. `themeFor` is only called with one of the six design-system categories. A medical or landscaping page does not get a false "The studio" or "The market" heading.

Rejected, and why:

- Font preload. The president review said it earns no rubric points.
- `missing: 'omit'` as the default. The design system and the lane rule say missing facts render `to confirm`. Omit was not added.
- Editing `lib/design-system/sections.ts` to drop repeated eyebrows ("Services" over "Services") or to rename the nav "Book" link. That package is the design-system lane. The wired page still shows those strings.
- Recoloring the six themes, or building the other Washington Street shops. The president review said not to do that before a decision on the Brighton demo.
- Putting the example's phone, hours, or services onto the Brighton page. Those belong to the synthetic fixture or to an unconfirmed listing, not to the two confirmed facts.

## L12 quality gate

Fetched `cursor/l12-quality-gate-3232` (draft MR !7) and did not edit `lib/business-classification.ts`, `lib/concept-imagery.ts`, or `lib/site-evaluation.ts`.

That preflight fails an internal concept whose `internalDisclaimer` does not include `Internal concept, not endorsed by the business`, or whose `noindex` / `robots` does not say noindex. The rendered document includes the exact sentence in the banner and the footer, and `<meta name="robots" content="noindex, nofollow, noarchive">`. The blueprint now carries the same sentence and `noindex: true`. This lane did not run !7's tests against its own files, because those files are not on this branch. The fields !7 reads are present.

## VERIFIED

`npx tsc --noEmit` — exit 0.

`npm test` — exit 0. 314 TypeScript tests passed, 41 `tests/*.test.mjs` passed.

`npm run lint` — exit 0. 5 warnings, 0 errors. The warnings are the existing `<img>` and unused-parameter notes in `components/site-industry-sections.tsx` and `postcss.config.mjs`. This lane did not change those lines.

`npm run build` — first invocation exit 1 after a successful compile, because Next.js 16.4.0 stops on its security advisory. Retry exit 0. Next.js was not upgraded.

`node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON qa/generator/render-example.mjs` — exit 0. Writes static documents and screenshots.

`node qa/generator/score-site.mjs` on 2026-11-11, Chrome, 390×844, reduced motion:

| Document | Score | heading | variety | image-alt | fonts | boilerplate | overflow | contrast | perf |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Wired example `qa/generator/output/example-data-barbers` | **92** | 12 | 12 | 4 | 14 | 10 | 14 | 14 | 12 |
| Stock `renderSite` before wiring, same example facts, fonts copied | **90** | 12 | 10 | 4 | 14 | 10 | 14 | 14 | 12 |
| Brighton Barbers after, name and street only | **92** | 12 | 12 | 4 | 14 | 10 | 14 | 14 | 12 |

Perf on the wired example: html 21171, css 0, js 0, fonts 96192, images 0. No remote font stylesheet. `image-alt` stays 4 because the mark is an inline SVG, not an `<img>`. The audit's target allows that. `pass: false` on the report means not every check is at its maximum; image-alt's maximum is 10.

The audit's earlier Next.js production render was **63/100**. This run did not rebuild that Next shell, so 63 was not re-measured.

Screenshots:

- Before, committed renderer, name only: `qa/generator/output/brighton-barbers-before/screenshots/desktop-1440.png` and `mobile-390.png`
- After, renderSite: `qa/generator/output/brighton-barbers-after/screenshots/desktop-1440.png` and `mobile-390.png`
- Example after: `qa/generator/output/example-data-barbers/screenshots/`

## CLAIMED but unverified

- The in-app iframe was not opened in a browser. The scored pages are the static documents. The iframe `srcDoc` is that document with font URLs at `/fonts/` instead of `fonts/`.
- !7's preflight was not executed on this branch. Only its source was read.

## Blockers

- Next.js 16.4.0's security advisory makes the first `npm run build` exit 1. The retry exits 0. Upgrading Next is outside this lane.

## Needs another lane

- `lib/design-system/render.ts` still labels every nav's last link "Book", including when no booking URL exists.
- `lib/design-system/sections.ts` still prints a section eyebrow that repeats the heading.
- `lib/business-classification.ts` on this branch has no `line` field. The local word list should be deleted once !7 is merged and `decision.line` is the only source.
- The client-export scaffold is still a Next app. The page it renders is the static document inside an iframe. Replacing that scaffold with a plain HTML file is an exporter change. The owner-approval gate in `scripts/export-client-site.mjs` was not weakened.

## Suggested next step

Review the Brighton screenshots against the two confirmed facts. Do not merge until !7's preflight is run on the combined tree.
