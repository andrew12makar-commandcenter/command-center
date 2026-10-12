# Feedback loop: production integration plan

Status: **not applied.** The files below were being edited by another agent
(image authorization and motion work) when this plan was written, so nothing
in them was changed. Apply these steps only after that work is finished and
committed, one step per commit, running `npm test`, `npm run typecheck`,
`npm run lint` and `npm run build` after each.

All loop code lives in new files under `lib/generator-loop/`. The adapters
in `lib/generator-loop/integration.ts` are pure functions; the app only fetches
data and calls them. No migration is required.

Snapshot of the files these patches target (Mac tree, 2026-10-12 03:13 UTC):
`app/app/demos/feedback-actions.ts`, `lib/demo-engine.ts`,
`app/app/demos/benchmarks/page.tsx`. Re-read them before applying; if their
shape changed, adapt the patch rather than forcing it.

## Checklist

1. [ ] **Rules from reviews** in `applyLearnedPreferences` (feedback-actions.ts).
2. [ ] **Store loop evidence** in `generator_evaluations` from the same action.
3. [ ] **Persist rules** in `design_preference_rules` (cc-rule/v2 rows).
4. [ ] **planGeneration** honours hierarchy, palette, motion and CTA structure (demo-engine.ts).
5. [ ] **Production renderer** reads the motion hints (site-renderer, after the motion work lands).
6. [ ] **Benchmark gallery** shows loop rows beside the existing fixtures.
7. [ ] **Rating action** unchanged; optional statement preview.
8. [ ] **Dataset export** script reading `demo_feedback` + `demo_revisions`.

Steps 1 to 3 are independent of the other agent's renderer work and are the
smallest useful integration.

## 1-3. applyLearnedPreferences (minimal patch)

Current code derives `preferences` with `derivePreferences(...)` and then calls
`planGeneration(...)`. Replace that block with the loop, keeping the save and
redirect logic exactly as it is.

```diff
+import {factsFromProduction,learnFromReviews,planNextRevision,rulesToRows,rowsToRules,evaluationToRow} from '@/lib/generator-loop/integration';
+import {getGeneratedConceptSet} from '@/lib/concept-imagery';
-import { derivePreferences, planGeneration, type DemoCopy, type FeedbackSample, type Template } from '@/lib/demo-engine';
+import { defaultPreferences, planGeneration, type DemoCopy, type Template } from '@/lib/demo-engine';
 ...
  const {data:ratings,error:feedbackError}=await supabase.from('demo_feedback')
-   .select('demo_id,user_id,template,visual_variant,rating,issue_tags,notes,created_at')
+   .select('demo_id,user_id,template,visual_variant,rating,issue_tags,notes,created_at,revision_no')
    .eq('organization_id',organizationId).eq('user_id',user.id)
    .order('created_at',{ascending:false}).limit(200);
  if(feedbackError) throw new Error('Your feedback could not be loaded.');
- const preferences=derivePreferences((ratings??[]) as FeedbackSample[],demo.template as Template,id);
+ // Load the reviewed revisions and their businesses (two queries, no N+1).
+ const demoIds=[...new Set((ratings??[]).map(r=>r.demo_id))];
+ const [{data:revisions},{data:demos},{data:ruleRows}]=await Promise.all([
+  supabase.from('demo_revisions').select('demo_id,revision_no,content').eq('organization_id',organizationId).in('demo_id',demoIds),
+  supabase.from('demo_sites').select('id,business_id,template,draft_content').eq('organization_id',organizationId).in('id',[...demoIds,id]),
+  supabase.from('design_preference_rules').select('scope,scope_key,instruction,active').eq('organization_id',organizationId).eq('user_id',user.id).like('instruction','cc-rule/v2%'),
+ ]);
+ const businessIds=[...new Set((demos??[]).map(d=>d.business_id))];
+ const {data:businesses}=await supabase.from('businesses')
+   .select('id,name,category,city,street_address,phone,service_area,website_url')   // never `notes`
+   .eq('organization_id',organizationId).in('id',businessIds);
+ type DemoRow={id:string;business_id:string;template:string;draft_content:DemoCopy|null};
+ const factsFor=(d:DemoRow|undefined)=>{
+  const b=d&&businesses?.find(x=>x.id===d.business_id);
+  if(!d||!b)return null;
+  const t=d.template as Template;
+  return factsFromProduction(b,d.draft_content?.siteContent,d.draft_content?.services??[],
+   {conversion:t==='medical'?'book':t==='landscaping'?'quote':'contact',generated:Object.values(getGeneratedConceptSet(t))});
+ };
+ const reviews=(ratings??[]).flatMap(row=>{
+  const facts=factsFor((demos??[]).find(d=>d.id===row.demo_id) as DemoRow|undefined);
+  return facts?[{row,facts,revisionContent:revisions?.find(r=>r.demo_id===row.demo_id&&r.revision_no===row.revision_no)?.content??null}]:[];
+ });
+ const {model}=learnFromReviews(reviews,rowsToRules(ruleRows??[]));
+ const currentFacts=factsFor((demos??[]).find(d=>d.id===id) as DemoRow|undefined);
+ if(!currentFacts) throw new Error('The business for this demo could not be loaded.');
+ const plan=planNextRevision(currentFacts,model,existing.design??defaultPreferences());
+ const preferences=plan.preferences;
  const existing=(demo.draft_content??{}) as DemoCopy;
  const generationSpec=planGeneration(existing.brand||'Business',demo.template as Template,preferences);
```

(The `existing` declaration must move above `planNextRevision`; the select
for `demo` must add `business_id`.)

After `save_demo_revision` succeeds:

```ts
await supabase.from('design_preference_rules').delete()
  .eq('organization_id',organizationId).eq('user_id',user.id).like('instruction','cc-rule/v2%');
await supabase.from('design_preference_rules').insert(rulesToRows(model,{organizationId,userId:user.id,evidenceDemoId:id}));
await supabase.from('generator_evaluations').upsert(
  evaluationToRow(plan.evaluation,plan.decisions,{organizationId,demoId:id,revisionNo:expectedRevision+1,
   generatorVersion:plan.generatorVersion,alignment:plan.alignment}),
  {onConflict:'demo_id,revision_no,evaluation_kind'});
```

Rows written by older code (free-text instructions) are ignored by
`rowsToRules`, never parsed by guesswork. Only `cc-rule/v2` rows are replaced.

Cost: one loop run per click, capped at 40 local evaluations, no network or
model calls. Typical run is under 50 ms.

## 4. planGeneration (demo-engine.ts)

Today `DesignPreferences` carries composition, a three-value typography tone,
image treatment, compact, conciseCopy and prominentNav. The loop also decides
hierarchy, palette, motion system, CTA structure and a five-value typography.
`candidateToPreferences` maps what fits; `unmappedDecisions` lists the rest.

Smallest patch: an optional fourth argument.

```diff
-export function planGeneration(name:string,template:Template,preferences:DesignPreferences){
+export function planGeneration(name:string,template:Template,preferences:DesignPreferences,
+  loop?:{hierarchy?:string;motionSystem?:'minimal'|'calm'|'precise'|'cinematic'}){
 ...
- const motion:MotionStyle=template==='medical'?'calm':template==='landscaping'?'cinematic':'precise';
+ const motion:MotionStyle=loop?.motionSystem&&loop.motionSystem!=='minimal'?loop.motionSystem:
+   template==='medical'?'calm':template==='landscaping'?'cinematic':'precise';
 ...
- sectionOrder:template==='medical'?[...]:...
+ sectionOrder:loop?.hierarchy==='proof-first'?['hero','trust','services','about','contact']:
+   loop?.hierarchy==='story-first'?['hero','about','services','proof','contact']:
+   loop?.hierarchy==='action-first'?['hero','contact','services','about','proof']:
+   template==='medical'?[...]:...
```

Palette and CTA structure need renderer support (step 5) before they are worth
passing through.

## 5. Production renderer

After the motion work lands, `motionHints(candidate)` returns an object shaped
like `MotionPlan` (`pageEntry`, `sectionReveal`, `mediaMotion`,
`navigationMotion`, `staggerMs`). Store it as `generationSpec.motionPlan` when
the loop planned the revision. Reduced-motion handling stays in the renderer's
existing CSS. Nothing else in the renderer needs to change for steps 1 to 4.

## 6. Benchmark gallery

`scripts/run-feedback-loop.ts` writes `.local-lighthouse/feedback-loop/gallery.json`
via `galleryRow`. Each row carries the label "Structural checks only. Not an
aesthetic rating." The gallery page can import `runFeedbackBenchmark` and
`galleryRow` directly (pure, about 1 s for 32 businesses) or read the JSON in
development. Render each row with the production `SiteRenderer` only after
step 4, otherwise the gallery would show designs the renderer cannot express.

## 7. Rating action

No change is required: interpretation is deterministic, so statements are
re-derived from `demo_feedback.notes` when needed. Optional: after the upsert,
show the reviewer what was understood:

```ts
const preview=interpretFeedback(feedbackRowToEvent({...row},{businessId,industry,reviewed})).statements;
```

and list `unclear` statements so the reviewer can rephrase.

## 8. Dataset export

A server-only script reads `demo_feedback`, `demo_revisions`, `businesses`
(without `notes`) and `generator_evaluations`, rebuilds `ReviewRecord`s with
the same functions, and writes `exportDataset(records, people)` where `people`
lists team member names from the site content so they are redacted. Run
`auditExportLine` on every line and refuse to write the file if any line fails.

## Not ready yet

- The loop renders its own test page. Until step 4 and 5 land, a production
  revision only receives the decisions `DesignPreferences` can carry.
- Real reviewer feedback has not been through the interpreter. Expect lower
  recall than the 0.82 measured on paraphrases; holdout styles scored 0.17.
