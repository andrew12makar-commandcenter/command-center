# L12-quality-gate

Lane: L12

Goal: Make business classification cover barber, salon/skin care, produce/grocery, deli/market, and convenience store, and make blueprint preflight fail a site that is missing the internal-concept disclaimer or noindex, states a price, hours, or review without quote/author/source, or uses placeholder or generic copy. Draft MR only. Do not set `owner_approved`.

## VERIFIED

Commands run from the repo root on 2026-11-11, after `npm ci` (596 packages). Node tests do not set `owner_approved`.

```bash
npm run lint
```

Exit 0. `eslint .` reported 14 warnings and 0 errors. All warnings are in `components/site-industry-sections.tsx`, `components/site-renderer.tsx`, and `postcss.config.mjs`. This lane did not edit those files.

```bash
npm run typecheck
```

Exit 0. `tsc --noEmit` printed nothing.

```bash
npm test
```

Exit 0.

- `node --experimental-strip-types --test tests/*.test.ts`: tests 299, pass 299, fail 0
- `node --test tests/*.test.mjs`: tests 41, pass 41, fail 0

New coverage:

- Category and name-hint classification for barber, salon/skin care, produce/grocery, deli/market (including butcher shop), and convenience store. `tests/business-classification.test.ts`
- Trade marks for those five lines, and no dental or studio JPEG. `tests/concept-imagery.test.ts`
- Preflight failures for missing disclaimer, missing noindex, unsourced price, unsourced hours, review missing quote or author or source, placeholder copy, and generic template copy. A researched fixture with the exact disclaimer, noindex, and sourced facts is accepted. `tests/site-preflight-safety.test.ts`

```bash
npm run build
```

First run: Next.js 16.4.0 compiled, typechecked, and generated 19 static pages, then exited 1 with `Error [SecurityFatalError]` and told the command to be retried. Upgrade was not run.

Second run: exit 0. The same Next.js 16.4.0 printed that the version is affected by a known security vulnerability and continued. Routes listed include `/`, `/app`, `/app/demos`, `/login`, and `/tracker`.

Classification results checked by the new tests (hints, not verification of any real business):

| Input | Line | Sector | Template |
| --- | --- | --- | --- |
| category `barber` / name `Classic Barber Shop` | barber | personal_care | universal |
| category `skin care` / name `Ensueno Skin Care` | salon | personal_care | universal |
| name `Outluks Hair Studio` (no category) | salon | personal_care | universal, confidence `name_hint` |
| category `greengrocer` / name `Johnny D's Fruit and Produce` | produce | retail | universal |
| category `deli market` or `butcher shop` / name `Oliveira Deli Market` | deli | food | universal |
| category `convenience store` / name `Zisis Convenience Store` | convenience | retail | universal |

`shop: convenience` stays sector `retail` and is now line `convenience`. A plain `market` or `store`, a bar, a bookstore, and a plumber do not take those lines.

## CLAIMED-but-unverified

- Browser rendering of the SVG trade marks. Tests assert the data URI, the alt text, and that the src is not a `/concepts/medical|landscaping|universal-` JPEG. No page was opened.
- That a rendered HTML page contains the disclaimer or a robots meta tag. The preflight reads `internalDisclaimer`, `noindex`, and `robots` on the object passed to `evaluateSiteBlueprint`. It does not parse HTML.

## Blockers

- Next.js 16.4.0 stops the first `next build` with `SecurityFatalError`. The retry completed. Upgrading Next is outside this lane and was not run. Reference: https://registry.npmjs.org/-/npm/v1/security/advisories/bulk

## needs-other-lane

- `components/site-renderer.tsx` and `scripts/export-client-site.mjs` still do not print `Internal concept, not endorsed by the business` or `<meta name="robots" content="noindex">`. The gate fails an internal concept whose blueprint fields omit them. The page can still omit them until that lane renders the fields. This lane did not edit `components/` or `lib/design-system/`.
- `lib/site-blueprint.ts` still writes the consultancy headings ("Expertise organized around what comes next.", "A more useful introduction to the business.", "Talk directly with the team.") for every universal template. The gate rejects those phrases in headline, description, about, and services. It does not scan `narrative`, because the current benchmark corpus still stores those headings and `tests/generator-benchmarks.test.ts` requires every benchmark to pass preflight.
- `lib/site-presentation.ts` still sends every non-trade universal business, including `personal_care`, through `consult-path`. Produce and convenience are sector `retail`, and deli is sector `food`, so existing food/retail branches in `components/site-industry-sections.tsx` and `components/site-renderer.tsx` already pick menu or shop navigation for those three. Barber and salon do not.
- `lib/opportunity-board.ts` has no label for sector `personal_care`. It falls through to "Other recorded industry".
- `lib/business-specific-copy.ts` still appends "Contact the business directly for current information." `tests/business-specific-copy.test.ts` locks that sentence. This gate does not treat it as generic copy.
- Restaurant, cafe, and bookstore still get no concept image from `getMatchedConceptSet`. They are not given the dental, landscape, or studio JPEGs. A mark for them was not part of the five trades in this lane.
- Owner-approved exports are outside the internal-concept disclaimer and noindex checks. `factStatus === 'owner_approved'` is the existing publish fixture in `lib/generator-benchmarks.ts` and `tests/site-blueprint.test.ts`. This lane does not set that status. Unreviewed and researched sites fail without the exact disclaimer and noindex. Prices, hours, reviews, placeholder copy, and generic copy fail regardless of fact status. A blank disclaimer also fails an owner-approved object.

## Suggested next step

Have the renderer lane print the exact sentence `Internal concept, not endorsed by the business` and `noindex` for every blueprint that is not an owner-approved export, and have the blueprint lane stop writing consultancy headings when `classifyIndustry(...).line` is `barber`, `salon`, `produce`, `deli`, or `convenience`.
