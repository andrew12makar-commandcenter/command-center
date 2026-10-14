# Generator M8: image relevance and provenance

**Branch:** `codex/generator-media-context-oct14` from M6 checkpoint `41adf28`
**Agent:** ChatGPT
**Status:** Code committed for review; tests and browser QA not yet independently confirmed.
**Canonical agent ledger:** [GitHub issue #3](https://github.com/andrew12makar-commandcenter/command-center/issues/3) (CC-004).

## Why this work matters
The current business-specific generator includes both a learning-loop composer and the **actual internal demo / standalone renderer**. These are different paths. Improving only `lib/generator-loop/compose.ts` would not necessarily change the Brighton drafts rendered with `components/site-renderer.tsx`.

Verified source-level problems before this patch:
- The learning-loop composer consumed photos in raw input order; a staff image could be placed in a hero, or a generated concept in a team section.
- “Recent work” could be shown above entirely generated concept images in a visual-work business.
- The production renderer put approved staff portraits into its generic gallery alongside actual work and reused an image if it had both hero and gallery roles.
- Production gallery introduction copy could describe a *mix* of images when it contained only approved photos or only concepts.

## Implementation
1. `lib/generator-loop/compose.ts`: section-aware image allocation with declared photo roles. Hero gets hero/detail/gallery photos before generated concepts, team uses **only** authorized staff photos, and immersive layouts reserve a team slot even when the gallery comes first. Images are not reused; the density limit remains a ceiling. Generated concepts receive explicit labels instead of “Recent work”.
2. `lib/site-media-selection.ts`: reusable, deterministic selection for real demo and exported-site rendering. Only `permission='approved'` business images appear; generic galleries exclude `team` and `logo`; duplicate URLs across hero and gallery are removed; generated concepts are clearly distinct.
3. `components/site-renderer.tsx`: uses the shared production selector.
4. `components/site-industry-sections.tsx`: gallery explanatory text reflects which sources actually appear.
5. `tests/generator-loop.test.ts` and `tests/site-media-selection.test.ts`: tests for role relevance, late team placement, generated-staff protection, actual renderer selection, duplicates, image constraints and provenance copy.
6. `.github/workflows/ci.yml`: scope branch included in push checks (does not mean CI passed).

## Constraints and next verification
- No Supabase access, migration, live CRM edits, image download, scraping, API expenditure, production deploy, publishing or outreach.
- **Tests:** Not independently run by the current agent. Required: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, export smoke test, plus visual comparison across the fictional restaurant, medical and landscaping cases at mobile/tablet/desktop widths.
- Inspect the resulting actual `SiteRenderer` / exported-client HTML, not just the learning-loop output. Confirm no change to existing demo facts or generated image permissions.
- Do not merge this branch (or the other two scoped branches) without inspecting diffs/conflicts and obtaining explicit owner approval.
- **Important limitation:** This is a provenance/selection improvement, not a claim that the generator now creates varied bespoke layouts or photographs. The reusable composition and quality benchmarks are separate next work.

## Next workstream
CC-004 next phase: evaluate layout repetition using existing fictional-business benchmark corpus; fix the highest-impact confirmed composition defect in shared production renderer. Avoid new design templates or unmeasured feature additions until visual QA demonstrates a generalizable improvement.
