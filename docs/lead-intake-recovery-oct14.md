# Lead import recovery, October 14 2026

**Agent:** ChatGPT. **Branch:** `codex/intake-recovery-guard-oct14`. **Parent:** `integration/prospect-intake-generator-oct14` at `61aa5934f23c8dd63f0c233f5ab24080852f32c5`.

## Source-verified existing problem
`approveImportedRowImpl` previously created `businesses`, then inserted `business_sources`, then marked the staging record `imported` in **three independent PostgREST requests**. A failure after the first write could leave a CRM business with no durable staging link; a retry could create another CRM record. Two simultaneous imports could do the same. The existing `lead_import_rows.matched_business_id` field (migration 0002) and `businesses.id` primary key (migration 0001) offer a partial recovery path without creating or executing a new migration.

## Proposed and implemented isolated-branch behavior
- Only this **staged-row import path** supplies a CRM UUID directly; it uses the staged UUID (`businesses.id = lead_import_rows.id`). All other manually created CRM records retain their existing UUID generation.
- Before creating, look up the recorded `matched_business_id` or the deterministic staged UUID within the signed-in user's organization. Normalize the business names and **block**, rather than reuse, a mismatched CRM record.
- After creation, write `matched_business_id` on the still-pending staging row before attempting provenance insertion. Recovery also stamps this field when a previously created deterministic-ID CRM record has no staging link.
- On retry, enumerate expected provenance keys and insert only missing `source_type + source_url` pairs. Newly inserted sources use stable UUIDv8 keys derived from staging UUID + source type + URL, so the existing `business_sources.id` primary key prevents duplicate inserts from simultaneous retries of **one staging row**. Then update `review_status = imported` only if the row is still pending and links to the same CRM ID. A preexisting imported row is not imported twice.
- The research queue shows **Resume incomplete import** with a link to the existing CRM record and suppresses forms that could relink, skip, or edit a partially imported row. Server actions likewise guard the state.
- A primary-key conflict on concurrent creation is a **recoverable error**; the caller can reload and resume. It does not silently fall back to inserting a new UUID.
- Pure regression tests cover new vs resumed imports, partial staging-link failures, business identity mismatches, replays and deduplication of source evidence, and short business names. These are **not authenticated Supabase integration tests**.

## Important limits that remain
1. **Not a SQL transaction.** A multi-request import is still not atomic. A true database transaction for CRM + provenance + staging is the preferred long-term solution.
2. **Cross-row provenance races remain.** Two different staged rows linked to the same CRM business can still race to insert an identical source URL, because their deterministic evidence IDs differ. The same-row race is constrained by the existing source ID primary key, but global business/source uniqueness and transaction guarantees still require a separately authorized database change.
3. **Existing partial records** created by older releases with independent CRM UUIDs and no `matched_business_id` are not automatically identifiable as their original staging rows. They require a read-only audit and operator-reviewed reconciliation before retry.
4. **Production use is not certified.** No signed-in browser import on a disposable database, RLS test, schema migration, live CRM write, or concurrent database fault-injection test has been performed.
5. Do not merge into `main`, publish sites, contact prospects, deploy, migrate, or update the Mac worktree as part of this change. Migration 0008 remains unapplied.

## Required release verification
1. Observe the specific branch HEAD GitHub Actions unit suites, typecheck, lint, production build, standalone client export, and fictional-site Chromium visual QA; include counts and job log URLs.
2. In an **independent throwaway test Supabase project**, deliberately fail provenance insert and final staging update; retry; verify CRM business count remains 1, provenance count is not duplicated, and only the correct staged row finalizes. Repeat with two concurrent requests and a mocked column-missing compatibility path.
3. Test signed-in staging review, duplicate warning, disqualification/skip guards, recovery banner, campaign scoring and GBP source semantics. Verify records remain inside the active organization under RLS.
4. Verify the historical Brighton prospects **read-only**, then obtain explicit owner approval for any data correction or schema change. Do not infer a historical record is repaired merely because these new source files exist.

**Checkpoint:** This is a safety improvement to the isolated source branch, not an assertion that live lead intake is already reliable.
