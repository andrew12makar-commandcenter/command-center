# L2-skill-packs

## Lane
L2-skill-packs

## Goal
Add a versioned, data-only skill-pack format the website generator can import and apply. Packs carry design tokens, section templates, motion presets, layout recipes, copy-structure guidance, and quality checks. They cannot run code, fetch the network, set `owner_approved`, or replace the internal-concept disclaimer.

## What landed
- Format 1 types and validator: `lib/skill-packs/schema.ts`, `lib/skill-packs/validate.ts`.
- Registry plus folder/zip import: `lib/skill-packs/load.ts`, `lib/skill-packs/zip.ts`, `lib/skill-packs/import-pack.ts`, `scripts/import-skill-pack.mjs`, `skill-packs/registry.json`.
- Generator apply step: `lib/skill-packs/apply.ts`.
- Example pack, inactive: `skill-packs/example-night-venue/`. Structural pattern only (full-viewport scene, room switcher, glass docks, brass-on-black tokens, 380ms room fade, 600ms hint fade, reduced motion static). No photographs and no venue claims.
- How to add a pack: `docs/generator/skill-packs.md`.

## Generator hook
One file, `lib/demo-engine.ts` (`planGeneration`). `git diff --stat`: 15 insertions, 9 deletions (net +6). The new work is the import, the optional `generationSpec.skillPacks` field, and the call that merges active packs. With no active matching pack the returned spec is unchanged. Learned feedback (`feedbackCount > 0`) keeps composition, section order, and motion; the pack is still attached as data.

`planGeneration` passes the industry template. The example pack's `appliesTo` is only `night-venue`, and its registry row is `active: false`, so medical, landscaping, and universal drafts do not pick it up.

## VERIFIED
- `node --experimental-strip-types --test tests/skill-packs.test.ts` — 8 tests, 8 pass, 0 fail. Covers the example pack, validator rejections (network, `fetch(`, disclaimer rewrite, `owner_approved`, `factStatus`, script markup, `index, follow`, non-static motion, missing `noindex` check), folder import, deflate zip, wrapped zip, zip slip, symlink, unexpected file, dry-run, replace keeping `active`, apply/merge, learned-feedback precedence, and the `planGeneration` hook. The CLI test imported a zip written by `python3`'s `zipfile` (exit 0).
- `npm test` — exit 0. TypeScript tests: 295 pass, 0 fail. `tests/*.test.mjs`: 41 pass, 0 fail.
- `node_modules/.bin/tsc --noEmit --pretty false` — exit 0.
- `node_modules/.bin/eslint lib/skill-packs lib/demo-engine.ts scripts/import-skill-pack.mjs tests/skill-packs.test.ts` — exit 0.
- `npm run build` — first run compiled and generated 19 static pages, then exited 1 with Next.js `SecurityFatalError` (known advisory, upgrade not applied). Retry: exit 0, compiled, TypeScript finished, 19/19 static pages generated. The same security warning was printed and the build continued.

## CLAIMED-but-unverified
- The example's structural notes come from reading GitLab `andrew-makar-personal-projects-group/circle-venu` at HEAD: `index.html`, `core/style.css`, `transitions/fx.css`, and `docs/DECISIONS.md`. I did not open `rooms/kitchen/menu-data.js` or any image, and I did not run that site.
- No browser click-through. This change does not alter a page layout. The production build above is the check that the `node:fs` read inside `planGeneration` still compiles into the Next.js server build.

## Blockers
None for this lane.

## needs-other-lane
- The customer renderer (`lib/site-section-order.ts`, `components/site-renderer.tsx`) still draws only `services`, `about`, `process`, `gallery`, and `contact` from `sectionOrder`. Room switcher, hotspot, and glass-dock regions stay on `generationSpec.skillPacks` until a renderer reads them.
- `scripts/export-client-site.mjs` does not read pack check results or `skillPacks.robots` (`noindex, nofollow`). This lane did not edit `scripts/export-*.mjs` or `lib/design-system/**`.
- `createDraft` still stores its existing disclaimer sentence. Pack attachments always set `disclaimer` to `Internal concept, not endorsed by the business` and never set `owner_approved`.

## Suggested next step
Drop a real pack with `node scripts/import-skill-pack.mjs <folder-or-zip>`. New rows stay `active: false`. Set `manifest.appliesTo` to the templates it should affect (`medical`, `landscaping`, `universal`, or `*`), then set that row's `active` to `true` in `skill-packs/registry.json`.
