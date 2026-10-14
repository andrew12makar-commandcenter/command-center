# Command Center cross-agent coordination

**Canonical shared ledger:** [GitHub issue #3](https://github.com/andrew12makar-commandcenter/command-center/issues/3). This private issue is branch-independent. Each agent must read it and record work claims, checkpoints, blockers, and handoffs there.

Three sources serve different purposes:
- **Issue #3:** chronological cross-agent claims and evidence; updates only when someone posts. Not an automatic lock.
- **`docs/prospect-discovery-status.json`:** version-controlled Prospect Discovery snapshot shown in `/app/project-status`. Next.js bundles it from the checked-out commit. Changes on GitHub do not magically appear in a running local build.
- **`/app/roadmap`:** Supabase-backed venture milestones and activity history. Authenticated manual updates only, based on verified completion. Not automatically synced with GitHub.

## Before work
1. Read issue #3, examine branch heads/worktrees and run `git status`. Don't edit another agent's worktree or uncommitted files.
2. Claim a task in the issue: task ID, agent, branch/base SHA, files, scope, risks, next checkpoint.
3. Use a scoped new branch from a verified SHA if concurrent work is possible.

## At each checkpoint and handoff
Post in issue #3: UTC time, task ID, agent, status, old/new SHA, touched files, test commands and PASS/FAIL/NOT RUN outcomes, browser/DB evidence, blockers, next action/owner. Commit and push without force when appropriate. Preserve previous comments.

Update the Prospect Discovery JSON only when changing that workstream and coordinating file ownership. Update the Supabase roadmap only through verified authenticated UI actions. A committed patch is not proof of deployed or production-tested functionality.

## Current tasks
CC-001 shared ledger and pointers (ChatGPT); CC-002 accurate Opportunity Board counts/test visibility (ChatGPT); CC-003 exact GBP listing identity and decision makers (unassigned); CC-004 generator quality and repeatable benchmarks (unassigned); CC-005 Brighton outreach readiness (owner review required).

No PR, merge, deployment, publication, outreach, paid APIs, new Supabase writes or migration authorized as part of this work. Migration 0008 stays unapplied. No customer personal details or credentials in the ledger.

This is a **manual-update coordination protocol**, not an always-on agent or automatic sync. If automated GitHub/Supabase synchronization is added later, its permissions, trigger conditions and failure handling must be reviewed first.
