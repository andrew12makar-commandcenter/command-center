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

## Manual step for the owner
Open the Supabase SQL Editor for the business Command Center project, paste `supabase/migrations/0007_prospect_discovery.sql`, and run it once (after 0006).

## Session log
- 2026-10-13 (Claude): Tracker, migration 0007 and campaign-based discovery (M0–M1).
