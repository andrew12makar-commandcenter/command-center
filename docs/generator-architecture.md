# Website generator architecture

The generator is a guarded production pipeline, not a claim that Command Center retrains a foundation model.

## Flow

1. **Research intake** records source pages, candidate facts, and image provenance. Research images stay reference-only until the operator explicitly confirms reuse permission.
2. **Brief and design specification** converts business context and learned preferences into a versioned `generationSpec`: composition, typography, image treatment, service presentation, section order, conversion goal, rationale, and negative constraints.
3. **Blueprint** combines verified content with the design specification. It carries publishing blockers and contains no CRM dependency.
4. **Renderer** supports six compositional families rather than one template with color changes. Industry selects a relevant candidate set; a stable business hash varies new projects; explicit feedback overrides the default.
5. **Feedback loop** parses ratings, issue tags, and supported natural-language instructions. Applying preferences writes a new immutable demo revision and regenerates the design specification.
6. **Evaluation** rejects thin, unsourced, inaccessible, or conversion-less blueprints before export. Rendered-page, responsive, interaction, and Lighthouse evidence remain separate because they cannot honestly be inferred from JSON.
7. **Export** produces an isolated Next.js project only after owner approval and the quality gate. Internal research, CRM, Supabase, and private commercial notes are stripped.

## Preference scopes

Migration `0004_generator_intelligence.sql` adds explicit rules with `global`, `vertical`, and `project` scopes plus `prefer`, `avoid`, and `require` semantics. The current deterministic feedback adapter continues to work before the migration is applied. The next database-backed UI should merge rules in this order:

`global < vertical < project`, with `require` and `avoid` taking precedence over `prefer`.

Every applied rule must remain visible in the generated rationale. Silent preference changes are not allowed.

## Benchmark discipline

`npm run benchmark:generator` runs fictional dental, medical, landscaping, universal-service, and holdout cases. Fixtures test structure and generalization only. They are not examples of real-business claims or permission to use external assets.

Passing the deterministic benchmark is necessary, not sufficient. Before a client review, capture desktop and mobile screenshots, test every navigation and CTA target, run accessibility checks, build the isolated export, and run Lighthouse against the rendered deployment. Store those results separately from the source-site audit.

## Non-goals and boundaries

- No paid API calls or automated outreach.
- No public sharing or deployment without explicit approval.
- No copied competitor layouts, claims, testimonials, or unlicensed media.
- No claim of fine-tuning or model-weight training.
- No performance claim without a measured rendered build.

Fine-tuning should be considered only after collecting a sufficiently large, licensed dataset of briefs, structured specifications, accepted revisions, rejected revisions, rubric scores, and final outcomes. Retrieval and deterministic optimization remain cheaper, more inspectable, and easier to correct at the current data volume.
