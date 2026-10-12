# Visual design review rubric

Browser QA (`npm run qa:browser`) answers "does it render correctly?". It never answers "is it good?". This rubric is for the human reviewer looking at the screenshots in `artifacts/browser-qa/<run>/index.html`.

A site is **client-demo ready** only when a named reviewer records a pass on every line below, with the screenshot run it was judged against. No automated score substitutes for this.

## Criteria (pass / revise / fail, plus one concrete note)

1. **First impression (desktop and mobile first screen).** Would the owner recognise their business type in under 3 seconds? Is there one clear focal point?
2. **Hierarchy.** Headline, supporting line and primary action read in that order. Nothing competes with the action.
3. **Typography.** Sizes and weights feel deliberate; line length 45–80 characters for body text; no awkward one-word lines in headlines.
4. **Proportion and spacing.** Sections have consistent rhythm; nothing feels cramped or empty for lack of content.
5. **Imagery.** Every image is appropriate to the actual trade, rights-cleared or clearly disclosed as concept art, and adds information. No imagery is better than wrong imagery.
6. **Business specificity.** Copy names real services and places from reviewed facts. Nothing reads as filler that could belong to any company.
7. **Distinctiveness.** Compared with the other benchmarks in the same run, this does not look like the same template with different words.
8. **Conversion.** The next step (call, book, estimate, visit) is obvious and reachable from every screen size.
9. **Mobile.** Feels designed for a phone, not a squeezed desktop.
10. **Trust.** Nothing invented: no fake reviews, awards, years in business, prices or outcomes.

## Recording a review

Record per site: run id, reviewer, date, the pass/revise/fail per criterion, and specific change requests (for example "hero headline 20% smaller on mobile", "services feel generic: use the three reviewed service descriptions"). Change requests feed the generator loop; a revision must show a changed screenshot for each request before re-review.
