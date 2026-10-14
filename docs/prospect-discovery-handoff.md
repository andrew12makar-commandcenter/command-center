# Prospect Discovery MVP: agent handoff

**Status: `in_progress`.** Review checkpoint: merge commit `3e2f757` (nine Prospect Discovery commits + origin `235f637`); all tests, typecheck, lint and build were run on it. ChatGPT independently reviewed the implementation. Migrations 0005, 0006 and 0007 are applied and recorded in Supabase migration history. Existing counts remain 7 businesses and 25 staged leads; all 25 staged leads received only `triage_status = 'review_needed'`, and all new business qualification fields remain null. Next owner: Claude, for the controlled signed-in browser validation. Do not publish, share a demo or contact anyone during validation.

Machine-readable status: `docs/prospect-discovery-status.json` (shown read-only at `/app/project-status`).
Update both files before and after each milestone, after each commit or test run, before asking the owner a question, and before ending a session. No secrets, credentials, customer data or environment values.

## Where to work
- Worktree: `~/Documents/GitHub/command-center-checkpoint-test`, branch `codex/generator-intelligence-checkpoints-oct12`.
- Do not edit `~/Documents/GitHub/command-center` or `command-center-integration-preview` (same branch name, 3 commits behind, has a stash).
- No branch switching, no destructive git.

## Workflow being built
Discovery campaign → candidate review → deterministic qualification → shortlist → CRM import → Opportunity Board → website demo → pitch brief.
Reuse: `lead_import_rows` (staging), `businesses` (CRM), `/app/opportunities` (board), `createDemo` in `app/app/demos/actions.ts` (generator). No second CRM, board or generator.

## Key files
- `supabase/migrations/0007_prospect_discovery.sql`: `discovery_campaigns` plus nullable qualification columns. Must be applied manually.
- `lib/discovery-campaigns.ts` (pure) and `lib/discovery-campaigns-server.ts`: campaign validation, industry targeting, create/reuse.
- `lib/prospect-qualification.ts` (pure, tested): deterministic qualification. Strength and contact readiness are derived, never stored.
- `app/app/discovery/*`: campaign form and attributed scans.
- `app/app/leads/import/page.tsx`: Prospect Research Queue.
- `lib/project-status.ts` and `app/app/project-status/page.tsx`: this tracker.

## How the pieces behave
- Discovery (`/app/discovery`): each scan creates a campaign or adds to an existing one. Industry and keyword filter candidates before staging. Dedupe is unchanged.
- Queue (`/app/leads/import`): qualification is computed on every load by `qualifyStagedRow`. Only triage status, disqualification reason and manual overrides are stored.
- Import: writes `campaign_id`, `primary_opportunity`, `evidence_confidence`, `next_action` and `qualification_rationale` to `businesses`, and never sets `priority_score`. In the CRM these stored values act as overrides; clearing them in the CRM Qualification panel recomputes from current evidence (audits, sources).
- Opportunity Board (`/app/opportunities`): existing stages, plus a qualification line, campaign and opportunity filters, and Pitch brief / Website demo links.
- Demo: the existing `createDemo` form on the CRM record (`#website-demo`). Nothing is published automatically.
- Pitch brief (`/app/leads/[id]/pitch`): print or "Copy as Markdown"; the Markdown is also shown raw for pasting into a deck.

## Database status
- `0005_project_roadmap`, `0006_roadmap_execution_log` and `0007_prospect_discovery` are applied and recorded in Supabase migration history.
- Verified objects include roadmap activity, widened roadmap status, discovery campaigns, campaign-org triggers, qualification constraints and RLS policies.
- Post-migration verification: `businesses = 7`, `lead_import_rows = 25`, all 25 staged rows are `review_needed`, and the new business qualification columns are null on all 7 existing businesses.
- `0008_revoke_inherited_table_privileges.sql` is prepared locally but has not been applied. Review it as a separate security change after Prospect Discovery validation.

## Verification status
- Automated: all 189 .ts tests and 40 .mjs tests pass (the .mjs suite needs Linux or macOS native deps matching the machine; it passed after `npm ci` in a Linux copy). Typecheck passes. Lint shows 0 errors (14 pre-existing warnings). `next build` succeeds.
- Browser verification has NOT been done. The Supabase schema is now ready for the signed-in validation.

## Remaining / suggested next steps (safe for ChatGPT)
1. Claude pulls the tracker-only local commits and confirms the recorded 0005-0007 history.
2. Click-through: create a campaign and scan (Brighton, Boston certified) → shortlist → import one sufficiently clear candidate → check the CRM panel and board → generate an internal demo → open and copy the pitch brief.
3. Record exact browser evidence and update the tracker. Do not publish, share or contact anyone.
4. Optional polish: on CRM records, recorded email/contact name from the lead form could refresh contact readiness (it already does when the stored next_action is cleared).

## Preview validation (2026-10-14, Claude)
Local dev server on port 3107 (owner's Mac), signed in by the owner, against Supabase lxdnoxflwqmsvnoforgl with migrations 0005-0007 applied. All seven browser stages passed; see docs/prospect-discovery-status.json tests. Records created by the test: 1 campaign ("Test: Brighton website design"), 16 staged candidates, 1 CRM business imported from a clear-identity candidate, 1 internal demo draft. Nothing published, shared or sent. Observations for follow-up are listed under known limitations.

## M6: campaign-aligned scoring and first real batch (2026-10-14, Claude)
- Scoring: `lib/prospect-qualification.ts` 100-point model (need 30 for the campaign lane, fit 20, observable value 20, reachability 15, evidence confidence 15, minus documented penalties). Independent lane needs for website design, GBP, local SEO, geolocation. Evidence states: verified present / verified missing / likely weak / unknown / conflicting. Unknown is never treated as missing.
- Legal structure (LLC, Corporation...) is not an industry (`isLegalStructure`); Boston certified rows keep it as `legal_structure`.
- Evidence: free website check (`lib/website-evidence*.ts`) and the review form store under `lead_import_rows.raw_data.review`.
- Queue: "Your next 10 prospects" (test campaigns excluded), progress states, inline action errors; filters and details collapsed.
- Real batch: campaign "Brighton local businesses: website design (Oct 15 meetings)". 5 qualified prospects imported with pitch briefs; 3 internal draft demos. Prospect names are in the CRM and the owner report, not in this file.

## Session log
- 2026-10-13 (Claude): Tracker, migration 0007 and campaign-based discovery (M0–M1).
- 2026-10-13 (Claude): Merged origin 235f637 with a normal merge commit (3e2f757, no rebase, no force push); checks passed on it; pushed; tracker set to ready_for_review.
- 2026-10-13 (Claude): Qualification (M2), queue (M3), CRM/board/demo handoff (M4), pitch brief (M5), full verification. Also fixed 2 pre-existing lint errors (unescaped apostrophes) in app/app/intelligence/page.tsx.
- 2026-10-14 (ChatGPT): Applied and verified migrations 0006 and 0007 through the Supabase SQL Editor, reconciled migration history, confirmed 7 businesses and 25 staged leads remained, and handed controlled browser validation back to Claude.
- 2026-10-14 (Claude): M6 scoring refactor, source semantics, daily workflow, inline errors, free website checks; first real Brighton batch prepared. Ready for review.
