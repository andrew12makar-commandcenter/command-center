# Internal preview export

`scripts/export-internal-preview.mjs` writes a **static folder** for internal review of a generated site. It is a separate path from `scripts/export-client-site.mjs`.

The client exporter is unchanged. It still refuses content that is not owner approved, and it still blanks `internalDisclaimer` on the blueprint it writes. This preview path does not call that script, does not import it, and does not read, write, or set `owner_approved`.

## What every page contains

On every HTML page the exporter writes:

- A visible banner whose text is exactly `Internal concept, not endorsed by the business`.
- A visible footer with the same sentence.
- `<meta name="robots" content="noindex,nofollow,noarchive">`.

The disclaimer is not taken from the input. A blank `internalDisclaimer` on a generated blueprint does not remove it. If a page would be missing the banner, the footer, or the robots meta — or if CSS would hide either line — the exporter throws and does not create the destination folder.

`robots.txt` in the folder disallows all crawlers. That file is an extra guard. The required control is the meta tag on each page.

## Manifest

The output folder contains `internal-preview-manifest.json` beside the HTML pages:

- `kind`: `internal-preview`
- `sourceCommit`: `git rev-parse HEAD` at export time, or `unknown / to confirm` when that command does not return a commit
- `timestamp`: ISO-8601 time when the export ran

The manifest also records the business name, whether the name or an `example: true` flag marked the site as example data, the disclaimer sentence, the robots value, and the page file names. It does not record an approval flag.

## Usage

```bash
node scripts/export-internal-preview.mjs site.json ../internal-preview-folder
```

The destination must be a new path. An existing folder is left untouched.

Accepted input is either:

- a generated site object with `businessName` and optional `headline`, `description`, `services`, `contact`, `content.about`, and `pages`, or
- the private blueprint envelope (`exportType` `command-center-private-site-blueprint/v1` with `blueprint`).

`content.factStatus` is dropped while parsing JSON and is never read from an in-memory site object. Pages are explicit `pages` when that array is non-empty. Otherwise the script builds Home, and Services, About, and Contact only when those fields are present. Slugs must be simple lowercase words. Text is escaped. Only `http:` and `https:` URLs are shown, and they are labeled unknown / to confirm.

This folder is not a client website, not a deployment, and not owner consent.

## Example fixture

The verification fixture is **Example Lantern Street Bakery**. It is synthetic. The phone `617-555-0148` and the city name Example Town are placeholders. Hours, prices, testimonials, a street address, and owner approval are unknown / to confirm. Do not treat the export as a real business or as permission to publish.

## Checks

```bash
node --test tests/internal-preview-export.test.mjs tests/site-export.test.mjs
```

`tests/site-export.test.mjs` covers the client exporter and is not modified by this path.
