# Prospect Discovery MVP: agent handoff

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

## Manual step for the owner
Open the Supabase SQL Editor for the business Command Center project, paste `supabase/migrations/0007_prospect_discovery.sql`, and run it once (after 0006).

## Verification status
- Automated: all 189 .ts tests and 40 .mjs tests pass (the .mjs suite needs Linux or macOS native deps matching the machine; it passed after `npm ci` in a Linux copy). Typecheck passes. Lint shows 0 errors (14 pre-existing warnings). `next build` succeeds.
- Browser verification has NOT been done. It needs the Supabase env, a signed-in session, and migration 0007 applied.

## Remaining / suggested next steps (safe for ChatGPT)
1. Owner applies migration 0007.
2. Click-through: create a campaign and scan (Brighton, Boston certified) → shortlist → import → check the CRM panel, the board, generate a demo, and open the pitch brief.
3. Optional polish: on CRM records, recorded email/contact name from the lead form could refresh contact readiness (it already does when the stored next_action is cleared).

## Session log
- 2026-10-13 (Claude): Tracker, migration 0007 and campaign-based discovery (M0–M1).
- 2026-10-13 (Claude): Qualification (M2), queue (M3), CRM/board/demo handoff (M4), pitch brief (M5), full verification. Also fixed 2 pre-existing lint errors (unescaped apostrophes) in app/app/intelligence/page.tsx.
