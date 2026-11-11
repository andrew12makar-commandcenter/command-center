# Receipt: L4-internal-preview-export

- Lane id: L4-internal-preview-export
- Goal: add a separate static internal-preview export that keeps "Internal concept, not endorsed by the business" visible in a banner and footer on every page, adds `<meta name="robots" content="noindex,nofollow,noarchive">`, never reads, writes, or sets `owner_approved`, refuses to write if that disclaimer would be missing, and writes a manifest with the source commit, a timestamp, and `internal-preview`.
- Branch: `cursor/internal-preview-export-dc60`
- Base: `integration/release-candidate-oct14`
- Exporter commit verified below: `368c879c1245217913a6693aeff7d768461c3827`
- This receipt is a later commit. The example manifest records the exporter commit, not this receipt commit.

## VERIFIED results

### Focused tests

Command (run at `368c879c1245217913a6693aeff7d768461c3827`):

```bash
node --test tests/internal-preview-export.test.mjs tests/site-export.test.mjs
```

Output summary: TAP, 12 tests, 12 pass, 0 fail, duration about 179ms. The nine new tests cover the required disclaimer sentence, absence of `owner_approved` from the preview script, disclaimer and noindex on every written page, a throwing getter proving `factStatus` / `owner_approved` / `internalDisclaimer` are not read or set, a blank incoming disclaimer not being copied, refusal before the folder is created when the disclaimer or noindex would be missing or hidden, no overwrite of an existing folder, JSON parse dropping `factStatus`, the CLI leaving its input file unchanged, and the existing client exporter still requiring owner approval and still setting `internalDisclaimer` to an empty string. The three existing tests in `tests/site-export.test.mjs` passed unchanged.

### Client exporter and lib untouched

```bash
git diff --exit-code -- scripts/export-client-site.mjs
```

Exit 0 at the verified exporter commit. `lib/` was not modified.

### Example export

Fixture: Example Lantern Street Bakery. Synthetic. Phone `617-555-0148` and city Example Town are placeholders. Hours, prices, testimonials, a street address, and owner approval are unknown / to confirm. The input JSON included `content.factStatus` of `owner_approved` and `content.internalDisclaimer` of `""` so the preview could be checked against the client exporter's blanking behavior.

```bash
node scripts/export-internal-preview.mjs /tmp/l4-preview-src/example-lantern-street-bakery.json /tmp/l4-example-lantern-preview
```

Stdout:

```text
Internal preview created: /tmp/l4-example-lantern-preview
Pages: index.html, services.html, about.html, visit.html
No website was published. Review only.
```

Output tree:

```text
/tmp/l4-example-lantern-preview/
  about.html
  index.html
  internal-preview-manifest.json
  robots.txt
  services.html
  visit.html
```

Manifest:

```json
{
  "kind": "internal-preview",
  "sourceCommit": "368c879c1245217913a6693aeff7d768461c3827",
  "timestamp": "2026-11-11T18:14:41.316Z",
  "businessName": "Example Lantern Street Bakery",
  "exampleData": true,
  "disclaimer": "Internal concept, not endorsed by the business",
  "robots": "noindex,nofollow,noarchive",
  "pages": ["index.html", "services.html", "about.html", "visit.html"]
}
```

A direct read of those files: each HTML page contains the disclaimer sentence twice (banner and footer) and `noindex,nofollow,noarchive`. No output file contains `owner_approved`. `robots.txt` is `User-agent: *` / `Disallow: /` and does not repeat the disclaimer sentence.

### Chrome, headless

Google Chrome 157.0.8103.50. Opened each `file://` page from the export above.

For `index.html`, `services.html`, `about.html`, and `visit.html`, banner and footer `innerText` were exactly `Internal concept, not endorsed by the business`. Computed style: `display: block`, `visibility: visible`, `opacity: 1`. Banner height 53px, footer height 62px. Robots meta content was `noindex,nofollow,noarchive`.

A separate session at viewport 1100x800 loaded `index.html`, then clicked the Visit link. The location became `/tmp/l4-example-lantern-preview/visit.html`. Banner, footer, and robots meta were still present. Screenshots from that session:

- `/opt/cursor/artifacts/example-lantern-internal-preview.png`
- `/opt/cursor/artifacts/example-lantern-visit-page.png`

The stamp line on both screenshots reads `internal-preview · 368c879c1245217913a6693aeff7d768461c3827 · 2026-11-11T18:14:41.316Z`.

## CLAIMED-but-unverified

- Full `npm test` (TypeScript suite plus every `tests/*.test.mjs`) was not run.
- `npm run lint` was not run. `node_modules` is not installed in this environment.
- No hosted server, domain, or deployment. The pages were opened as local files.
- No human design review beyond the example fixture.

## Blockers

The recorded blocker "Internal preview path preserving the disclaimer not yet verified" is closed for this lane by the tests and the Chrome pass above. No new blocker in this lane.

## needs-other-lane

A Demo Studio button that runs this script would touch `app/` and is out of this lane. It must not call `scripts/export-client-site.mjs` and must not set `owner_approved`.

## Suggested next step

Keep client publication on `scripts/export-client-site.mjs`. If an internal review action is added in the app, point it at `scripts/export-internal-preview.mjs` and keep the generated folder noindex.
