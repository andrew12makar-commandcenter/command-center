# Skill packs

Skill packs are local design data for the website generator. A pack can contribute design tokens, section templates, motion presets, layout recipes, copy-structure guidance, and quality checks. A pack cannot contain executable code, image files, or instructions that fetch anything over the network.

The checked-in pack `skill-packs/example-night-venue/` is **example data**. It records structural patterns from a night-venue spatial tour (a full-viewport scene, a room switcher, glass docks, a brass-on-black palette, and a short fade). It does not include photographs, prices, hours, addresses, staff, testimonials, or venue claims. It ships **inactive**.

## Drop in a pack

Build a folder with `manifest.json` and `pack.json`. `README.md` is optional. Then import it from that folder or from a zip of the folder:

```bash
node scripts/import-skill-pack.mjs ./my-pack
node scripts/import-skill-pack.mjs ./my-pack.zip --replace
node scripts/import-skill-pack.mjs ./my-pack --dry-run
```

Import copies the validated files to `skill-packs/<id>/` and adds a row to `skill-packs/registry.json`. A new row is `active: false`. Replacing an existing pack keeps whatever `active` value is already in the registry. Turn a pack on by editing that flag. There is no network step.

`manifest.appliesTo` lists generator templates (`medical`, `landscaping`, `universal`) or `*` for every template. The example pack applies only to the tag `night-venue`, so leaving it inactive or even flipping `active` does not restyle medical, landscaping, or universal drafts until `appliesTo` includes one of those templates.

## Format

`format` is `1` on the manifest, the pack, and the registry. `version` is `major.minor.patch`. An id is lowercase words separated by hyphens, and it has to match the folder name. Ids that start with `example-` must set `example` to true and say "example" in the name or description.

`pack.json` holds:

- `tokens` — `color` (`#rgb`, `#rrggbb`, or `rgba()`), `font.display`, `font.body`, `radius`, and `space` (`px` or `rem`). Fonts are family names, not stylesheet addresses.
- `sections` — an id, a kind, slot names, and a template name. Slots are placeholders such as `place-label`. They are not claims about a real business.
- `motion` — presets with `reducedMotion` set to `static`, a duration, and the generator's motion names (`pageEntry`, `sectionReveal`, `mediaMotion`, `navigationMotion`).
- `layouts` — one of the six compositions, a `sectionOrder` drawn from `hero`, `services`, `trust`, `about`, `contact`, `proof`, `process`, `gallery`, and `visit`, named regions, and an optional `motionId`.
- `copy` — which slots a heading and a body use, short guidance, topics the pack refuses to invent, and the disclaimer below.
- `checks` — data rules, not code. Every pack must block on `keeps-internal-disclaimer`, `noindex`, `reduced-motion-static`, `no-owner-approval`, and `no-external-url`. Optional rules are `motion-duration-cap` (needs `maxMs`) and `section-present` (needs `sectionId`).

Unknown fields are rejected.

## What the validator refuses

- A `format` other than 1, missing required pieces, or an id that does not match the folder.
- Any `http:`, `https:`, `ftp:`, `javascript:`, `data:`, `file:`, `www.`, `url()`, or `//` address.
- `fetch(`, `import(`, `eval(`, `Function(`, `require(`, `<script`, or an event-handler attribute.
- A field named `factStatus`, `publishReady`, `robots`, `src`, `script`, `code`, or anything that sets `owner_approved`.
- A disclaimer other than exactly `Internal concept, not endorsed by the business`, or a field whose name would remove that line.
- Text that would turn previews back to `index, follow`.
- Symlinks, path traversal in a zip, encrypted zip entries, and files other than `manifest.json`, `pack.json`, and `README.md`. Finder junk (`.DS_Store`, `__MACOSX`) is ignored.

## How the generator uses a pack

`planGeneration` in `lib/demo-engine.ts` calls `applyActiveSkillPacks` and `mergeSkillPackIntoPlan`. That is the only generator edit. With no active matching pack, the returned spec is unchanged.

When a pack matches the template and the draft has no learned feedback, the last layout sets `composition` and `sectionOrder`, and the layout's `motionId` (or the last preset) sets `motion` and `motionPlan`. Learned feedback keeps those fields and still attaches the pack as data. The attachment is `generationSpec.skillPacks`. It always carries:

- `disclaimer`: `Internal concept, not endorsed by the business`
- `robots`: `noindex, nofollow`
- the merged tokens, sections, motion, layouts, copy, checks, and check results

Later packs in the registry win when two active packs set the same id. The customer renderer still draws only `services`, `about`, `process`, `gallery`, and `contact` from `sectionOrder`. Room switcher, hotspot, and glass-dock regions stay on the attachment until a renderer reads them. The exporter does not yet read pack check results.

`planGeneration` takes an optional fourth argument, a repository root, so tests can point at another `skill-packs/` directory. The app does not pass it.
