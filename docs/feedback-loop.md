# Generator feedback and evaluation loop

This is a structured preference, retrieval, generation and evaluation system.
It does not train or fine-tune any model weights. Every step is deterministic
local code: no network requests, model calls, crawls, image generation or paid
APIs. The run ledger records that, and the benchmark fails if any of them is
non-zero.

Code: `lib/generator-loop/`. Fictional corpus: `benchmarks/fictional-businesses.ts`.
Experiment: `scripts/run-feedback-loop.ts`. Tests: `tests/generator-loop.test.ts`.
Production integration plan: `docs/feedback-loop-integration.md`.

## What one review produces

Each review becomes a `ReviewRecord` (`dataset.ts`) holding:

- business id, traits and fact count, and the rendered revision id (hash of the HTML);
- the design decisions that were rendered, and the motion spec;
- the reviewer's exact text, split into statements, each classified as
  praise, criticism, requirement or unclear;
- per statement: the design decision it concerns, the operation
  (`prefer`, `avoid`, `require`, `forbid`, `more`, `less`, `keep`), the prior value, strength
  and scope (project, business trait, industry or global);
- every proposed adjustment with structural score and preference alignment
  before and after, per-metric deltas, before/after render ids, and the outcome
  (`accepted`, `rejected` before render, or `reverted` after measuring) with its reason;
- alternatives tried during search;
- image authorization state, generator and evaluator versions.

## Pieces

| File | Job |
| --- | --- |
| `design-space.ts` | Nine searchable decisions. Business traits derived only from facts: trust sensitivity, conversion type, imagery amount and quality, service complexity, locality, urgency, audience, depth of verified content, whether visual proof is central. |
| `feedback-interpreter.ts` | Lexical rules, no model. Statements, kinds, decisions, direction, negation, hedges, scope including "for businesses that ..." trait scope. Unattributable statements are kept as `unclear`. |
| `preference-model.ts` | Scoped rules. Induction across projects and industries. When evidence conflicts, it looks for a trait value that separates the two sides and learns a conditioned rule instead of discarding both. Measured reverts become evaluation constraints. Persistence in `design_preference_rules` without a migration. |
| `compose.ts`, `render.ts` | Facts plus decisions become a page plan and test HTML. Sections exist only when facts fill them. Business images only under a matching authorization and not marked low quality; generated images always disclosed. |
| `evaluate.ts` | Objective gates and structural metrics, kept separate from preference. |
| `loop.ts` | Rules applied one at a time and measured; bounded search; six modes; cost ledger. |
| `benchmark.ts` | The six-arm experiment, cross-validation, interpreter accuracy, review records. |
| `dataset.ts` | Record schema and redacting JSONL export with an audit. |
| `integration.ts` | Adapters for the rating action, rules table, evaluations table, `planGeneration`, renderer motion and the gallery. |

## Structural checks versus preference

`evaluate.ts` reports two things that are never added together into a single
claim about quality:

- **Gates** (pass/fail): CTA destinations verified, fact text traceable to
  facts, business images covered by authorization, generated images disclosed,
  no known fallback copy, one h1, alt text, 4.5:1 contrast for five colour
  pairs, every section has an entrance transition, and reduced motion
  disables all transitions.
- **Structural metrics** (0 to 1): content specificity, template-heading share,
  CTA clarity, typography and hierarchy, imagery density and relevance, mobile
  layout, accessibility, motion coverage, reduced motion, visual balance,
  excessive whitespace, repetitive card use, source compliance.

Preference is `alignment`: agreement with the active feedback rules. Neither
number says a page looks excellent. A browser pass (Playwright, optional)
checks real overflow at 1440 and 390 px, tap targets under 44 px and computed
transitions under reduced motion. Screenshots are optional and cached.

## Cost controls

- Cache keys are stable hashes: evaluations by evaluator version, facts and
  decisions; interpretations by event; browser checks and screenshots by HTML.
  A rerun with unchanged inputs performs zero evaluations and zero browser renders.
- Cheapest checks first: hard rules, learned constraints, missing content and
  palette contrast reject a candidate before it is composed or rendered.
- In `rules+search` and `hybrid` modes only the decisions feedback touched
  are searched. With no feedback, search stops immediately.
- An upper bound (a perfect structural score plus the candidate's alignment
  and diversity) skips candidates that cannot beat the current design.
- Per-run budget: rounds, candidates per round, evaluations, browser renders,
  crawls, model calls and image generations. The last three are zero.
- Each run records estimated versus actual evaluations and elapsed time.
- Research is reused, never re-crawled. Generated images are reused from the
  bundled set; none are created.

## Experiment and results (2026-10-12)

Corpus: 32 fictional businesses in 15 industries, 18 train and 14 holdout.
Legal, nonprofit, financial, automotive and unusual businesses appear only in
holdout. Learning uses 18 plain-style training notes. 13 holdout notes are in
five styles absent from training (designer jargon, terse, client voice,
emotional, adversarial) and carry 24 written expectations. Holdout agreement
is scored against those expectations, not against the interpreter's reading.
Model selection used leave-one-business-out cross-validation on training
notes (46 expectations), never the holdout.

| Arm | Holdout agreement | Train CV | Evaluations | Rejected pre-render | Cache hit rate |
| --- | --- | --- | --- | --- | --- |
| baseline | 0.292 | 0.348 | 32 | 0 | 0 |
| retrieval | 0.583 | 0.565 | 126 | 1 | 0.20 |
| rules | 0.500 | 0.630 | 61 | 40 | 0.36 |
| search | 0.333 | 0.370 | 584 | 54 | 0.09 |
| rules+search | 0.625 | 0.652 | 299 | 152 | 0.35 |
| hybrid | 0.583 | 0.630 | 296 | 181 | 0.44 |

No arm had a structural gate failure. Structural scores sit between 0.91 and
0.93 for every arm, so they do not separate the designs; preference agreement does.
A browser pass over the 32 chosen pages found no overflow at 1440 or 390 px,
no tap target under 44 px, and no transition left running under reduced motion.

Screenshot review found a defect the metrics missed: a single image beside a
short service list left a large empty block. The composer now attaches a side
image only beside enough text, and `visualBalance` checks for the pattern.
That is the kind of issue only visual review catches; it is why structural
scores are not presented as design quality.

First holdout measurement, before any change chosen by cross-validation:
baseline 0.292, retrieval 0.583, rules 0.458, search 0.333, rules+search
0.500. Two changes were then made because cross-validation on training notes
showed rules underperforming retrieval: trait-separated induction for
conflicting evidence, and the hybrid arm. A later fix stopped preferences
from shadowing measured constraints (a correctness fix found by a unit test).

Interpreter accuracy against written expectations: dev paraphrases precision
0.82, recall 0.82. Withheld holdout styles precision 0.50, **recall 0.17**.
The lexical interpreter misses most designer, emotional and adversarial
phrasing. Vocabulary that appeared only in holdout notes was deliberately
removed from the interpreter so the holdout stays honest. The arms still
improve holdout agreement because rules learned from training feedback
generalise even when the holdout note itself is not understood.

## What is learned and what is fixed

Learned from data (changes when feedback changes): explicit rules per
project, trait, industry and global scope; induced industry rules; trait
relationships such as "fewer photos and calmer motion when visual proof is not
central" and "more photos when it is"; evaluation constraints from measured
reverts; retrieval of the most similar reviewed design.

Fixed by code (does not learn): the interpreter vocabulary, trait derivation,
trait defaults, the evaluator's checks and weights, the composer, the search
procedure and thresholds.

## Not validated

- Nothing here has been checked against real reviewers. All feedback is
  fictional and written by the same author as the interpreter, which flatters
  the interpreter even with the holdout precautions.
- The loop renders a test page, not the production `SiteRenderer`.
- Structural metrics are heuristics. Real visual quality needs human review.
- Imagery shortfalls (asking for more images than exist) are reported but not
  resolved, because image generation is disabled in this loop.
