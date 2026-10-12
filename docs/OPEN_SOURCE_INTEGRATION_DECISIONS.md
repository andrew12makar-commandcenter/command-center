# Open-source integration decisions

Each library must improve a real workflow and be proven by a specific test. Installing is not progress. Re-evaluate an entry only when its "trigger" occurs.

Audited against commit `e85155a` (Next.js 16, React 19, Tailwind 4, Supabase, Lighthouse 13, native `node:test`). Existing pieces that already work and are reused: bounded same-domain research (`scripts/local-site-research.mjs`, `scripts/site-candidates.mjs`), URL safety guard (`scripts/local-audit-guard.mjs`), local Lighthouse, blueprint + standalone exporter, CSS motion system.

## Adopt now

| Library | License | Problem it solves | Duplicates? | Proof of value |
|---|---|---|---|---|
| **@playwright/test** (Chromium) | Apache-2.0 | No real-browser evidence existed; every prior "100/100" was structural preflight only. | No. Lighthouse audits one page load; it does not click, resize, or screenshot breakpoints. | `npm run qa:browser`: 8 benchmarks × 3 widths, screenshots + findings. First run found 19 blocking defects (contrast, frozen scroll reveals, wrong-trade imagery, no mobile nav) that unit tests had passed. Dev-only. |
| **@axe-core/playwright** | MPL-2.0 (axe-core) | WCAG checks on the rendered DOM at each width. | Partly: Lighthouse bundles axe for one mobile run. Kept because it covers desktop/tablet and runs in the settled reduced-motion state. Dev-only. | `axe:*` findings in browser QA (caught 15 serious contrast failures). |
| **Lighthouse** (already installed) | Apache-2.0 | Lab performance/SEO. | Reused, not duplicated: browser QA drives it through the Playwright Chromium via `--lighthouse`. | Per-site scores in `report.md`, labelled as local lab numbers. |
| **Cheerio** | MIT | Regex-based HTML extraction in research scripts misses nested markup, JSON-LD and microdata. | Replaces fragile regex inside the existing bounded fetcher; does not add a crawler or bypass the guard. | Checkpoint 13: fixture pages → traceable facts (URL + capture time) for services, contact, hours, JSON-LD. |
| **DuckDB** (`@duckdb/node-api`, dev-only; `httpfs` extension only, no spatial extension needed because Overture's `bbox` column is filtered directly) | MIT | Querying Overture Places GeoParquet by bounding box without downloading whole releases. | No. | Checkpoint 11: bounded ring query returns attributed candidates staged outside the CRM. |
| **Overture Maps Places** (data) | CDLA-Permissive-2.0 (places theme; check per-release attribution) | Open, bulk business-location discovery. | Complements OSM; neither is treated as verification. | Same as DuckDB. Records are candidates, never "verified". |

## Evaluate later (with trigger)

| Library | Trigger to adopt | Notes |
|---|---|---|
| **Zod** (MIT) | Checkpoint 14 business knowledge model, when imported research JSON crosses a trust boundary. | Current hand-written sanitizers (`site-blueprint.ts`) are tested; replace only where a schema removes duplicated validation. |
| **Sharp** (Apache-2.0) | First owner-supplied or rights-approved images exist to process (Checkpoint 15). | Never used to strip credits or watermarks. Native binary; confirm it installs in CI and the exporter. |
| **Puck** (MIT) | After Checkpoint 16 proves distinct compositions, so editing is not polishing a weak template. | Must read/write the existing `SiteBlueprint`, not a second format. |
| **Motion** (MIT) | Only if a needed interaction cannot be done in CSS. | Browser QA showed the real motion defect was a CSS scroll-container bug, now fixed without a library. CSS also works in exports with zero client JS. |
| **tldts** (MIT) | Identity resolution (Checkpoint 12) needs registrable-domain matching across subdomains/ccTLDs. | `new URL().hostname` is sufficient until multi-source matching starts. |
| **Crawlee** (Apache-2.0) | Measured need: queueing/retries across many sites exceeds the bounded single-site fetcher. | Its scale features (proxy rotation, fingerprinting) must stay off. |
| **shadcn/ui** (MIT, copied source) | A specific accessible primitive (dialog, tabs) is needed in the Command Center UI or a proposal mode. | Customer sites are bespoke Tailwind; importing a component kit would make them look more templated. |

## Reject

| Option | Reason |
|---|---|
| Paid screenshot / visual-diff services | Playwright covers it locally at no cost. |
| Pixel-diff snapshot testing as a quality gate | Generated designs are supposed to change; snapshot diffs would block improvement. Screenshots are kept for human review instead. |
| Scraping Google Maps / Places photos | Terms and storage restrictions. Google Places stays an optional, separately approved API. |
| Proxy rotation, stealth plugins, CAPTCHA solvers | Out of policy for this project. |
| Large local image models on the Mac | Not until memory, runtime and model-weight licenses are evaluated and approved. |

## Sandbox note

The development sandbox blocks Playwright's browser CDN, so local runs set `QA_CHROMIUM_PATH` to a Chromium build installed from npm. GitHub CI uses the standard `npx playwright install --with-deps chromium`. Nothing in the repository depends on the sandbox workaround.
