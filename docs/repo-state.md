# Repository state

Verified on 2026-11-11 from `git fetch origin --prune` and from the GitLab project API for `andrew-makar-personal-projects-group/command-center` (project id 88765146, private, https://gitlab.com/andrew-makar-personal-projects-group/command-center).

- GitLab default branch: `main`. This lane did not change it.
- Origin has no tags.
- GitLab `list_pipelines` for this project, before the merge request that adds `.gitlab-ci.yml`, returned an empty list.
- Local branches `main` and `integration/release-candidate-oct14` matched `origin` at the SHAs below at the time of that fetch.

Committer dates are `git log -1 --format=%cI`. "Vs release candidate" is `git rev-list --count` against `origin/integration/release-candidate-oct14`. Tracked-file counts are `git ls-tree -r --name-only`.

## Which branch holds the application

`main` (`5caa55c5c0c4e11bfb2a750e043247b7a95e5aca`) is the one-file initial commit. Its only tracked file is `README.md`, whose contents are the line `# command-center`. It does not contain the Next.js app.

The application tree this lane checked out is `integration/release-candidate-oct14` at `c6219dfb2e6f53f0915c626555ec0919fd212262` (248 tracked files: `package.json`, `package-lock.json`, `app/`, `tests/`, and the rest of the Next.js project). Tip subject: "Add review-only public business list import with preview". Committer date: 2026-10-18T19:56:13-04:00.

Two later heads contain that commit plus commits the release candidate does not have:

- `feature/client-sites` at `11881ccde6a4d0ee4992e8ca3b10039f9d49c2f6` is 2 commits ahead and 0 behind. Those commits are `405f84baced8ad360c6df8d231c178c36bdad2cd` ("Add Client Sites area: registry, Circle Tavern dashboard, read-only GitHub activity") and `11881ccde6a4d0ee4992e8ca3b10039f9d49c2f6` ("Client Sites: judge open items by state columns and section heading"). The diff against the release candidate is 7 files (433 lines): `app/app/client-sites/page.tsx`, `app/app/client-sites/[slug]/page.tsx`, `app/app/client-sites/ui.tsx`, `components/command-center-nav.tsx`, `lib/client-sites.ts`, `lib/client-sites-server.ts`, `tests/client-sites.test.ts`.
- `deploy/cloudflare-staging-nov03` at `eba521d90c81e669f3821db626f8600586b1ef74` is 1 commit ahead and 0 behind. That commit adds only `docs/CLOUDFLARE_STAGING_2026-11-03.md`. It is not an ancestor of `feature/client-sites`, and `feature/client-sites` is not an ancestor of it. This lane did not re-verify the account or DNS statements inside that document, and did not deploy anything.

Every other remote branch below is an ancestor of `integration/release-candidate-oct14` (0 commits of its own that are missing from that head). `feature/nextjs-foundation` has `package.json` and no `package-lock.json`. Later ancestor branches have `package-lock.json`. `main` has neither.

## Branch map

| Branch | Head SHA | Committer date | Tip subject | Tracked files | Vs release candidate |
| --- | --- | --- | --- | ---: | --- |
| `main` | `5caa55c5c0c4e11bfb2a750e043247b7a95e5aca` | 2026-10-09T19:31:53+02:00 | Initial commit | 1 | ancestor, 423 commits behind |
| `feature/nextjs-foundation` | `32374f8acb84362b7350376bb4827b5a4668d8c0` | 2026-10-12T06:09:44+02:00 | Polish dual-venture sidebar with active, next, blocked and activity feed | 84 | ancestor, 271 commits behind |
| `claude-local-work-oct12` | `034d1678c34f2aee0fddf8f53836907253414c6d` | 2026-10-12T00:41:06-04:00 | Checkpoint: Preserve Claude website generator development - Oct 12 | 114 | ancestor, 279 commits behind |
| `integration/claude-roadmap-oct12` | `5b21577cde642dadd6b13b885199fa5ab33e8466` | 2026-10-12T06:58:38+02:00 | Fix apostrophe escaping in roadmap migration guidance | 122 | ancestor, 277 commits behind |
| `codex/generator-validation-oct12` | `27acb2ee7a0a376adc83c5433f335f15cb1405c3` | 2026-10-12T01:33:13-04:00 | Validate standalone exports and keep conversion content visible | 123 | ancestor, 276 commits behind |
| `codex/generator-intelligence-checkpoints-oct12` | `41adf280f2df22211a145c49dba0418b117b9632` | 2026-10-14T05:06:33-04:00 | docs(tracker): M6 ready for review with batch and browser evidence | 184 | ancestor, 158 commits behind |
| `codex/gbp-evidence-guardrails-oct14` | `a7a11b650d30c6de8d5d6fce24758aa52522f293` | 2026-10-14T05:27:11-04:00 | ci: validate scoped Google Business URL evidence branch | 186 | ancestor, 150 commits behind |
| `codex/agent-ledger-board-counts-oct14` | `b9881e2a2f0c95b1e79f41220203932fbb464100` | 2026-10-14T05:28:57-04:00 | docs(tracker): capture latest board regression and pending CI | 187 | ancestor, 144 commits behind |
| `codex/generator-media-context-oct14` | `5fd2cf4fc2f3c328a7e3b564925f2531b942beb8` | 2026-10-14T17:28:05-04:00 | ci: verify ESLint alongside tests, typecheck, build and export | 187 | ancestor, 143 commits behind |
| `integration/prospect-intake-generator-oct14` | `61aa5934f23c8dd63f0c233f5ab24080852f32c5` | 2026-10-14T17:47:55-04:00 | fix(intake): normalize CSV addresses and ZIP for dedupe; improve mobile labels | 194 | ancestor, 113 commits behind |
| `codex/intake-recovery-guard-oct14` | `d6378784de0ea8453fd97acc84688156372d5f67` | 2026-10-14T18:21:16-04:00 | docs(status): record fully verified integration CI and pending staged-import recovery gate | 197 | ancestor, 86 commits behind |
| `codex/intake-auth-isolated-qa-oct14` | `38fd925054f7176c1e2cc2f9b7bfa065125a4252` | 2026-10-14T18:58:50-04:00 | fix(typecheck): retain deterministic source ID for duplicate-link action after import extraction | 201 | ancestor, 75 commits behind |
| `codex/intake-atomic-isolated-oct14` | `1c80439585e6665fa9218f110e6f873a746d25e3` | 2026-10-14T19:25:39-04:00 | safety(atomic): isolate deploy-review SQL candidate from destructive CI-only fault injector | 203 | ancestor, 65 commits behind |
| `integration/release-candidate-oct14` | `c6219dfb2e6f53f0915c626555ec0919fd212262` | 2026-10-18T19:56:13-04:00 | Add review-only public business list import with preview | 248 | this head |
| `deploy/cloudflare-staging-nov03` | `eba521d90c81e669f3821db626f8600586b1ef74` | 2026-11-03T01:26:42-05:00 | docs: record isolated Cloudflare staging plan and domain safeguards | 249 | 1 commit ahead, 0 behind |
| `feature/client-sites` | `11881ccde6a4d0ee4992e8ca3b10039f9d49c2f6` | 2026-11-03T09:17:21-05:00 | Client Sites: judge open items by state columns and section heading | 254 | 2 commits ahead, 0 behind |

## Recommended default branch (not executed)

Leave the GitLab default branch as `main` until Andrew approves a change. This document does not perform that change.

Recommended sequence, for approval:

1. Keep opening integration merge requests into `integration/release-candidate-oct14`. That head already contains every other remote branch except the two descendants named above.
2. Review, then merge, `feature/client-sites` (`11881ccde6a4d0ee4992e8ca3b10039f9d49c2f6`) and `deploy/cloudflare-staging-nov03` (`eba521d90c81e669f3821db626f8600586b1ef74`) into that integration branch. Merging only one of them drops the other's unique commit.
3. After those two heads are contained in the integration branch, set the GitLab default branch to `integration/release-candidate-oct14`.

Do not point the default at current `main`: it has no application. Do not point it at `feature/client-sites` alone: that omits `docs/CLOUDFLARE_STAGING_2026-11-03.md`. Do not point it at `deploy/cloudflare-staging-nov03` alone: that omits the Client Sites commits.

Unknown / to confirm: whether Andrew wants those two descendant commits on the default line before the switch.

## Recommended backup (not executed)

The three heads that are not redundant with each other are:

- `integration/release-candidate-oct14` at `c6219dfb2e6f53f0915c626555ec0919fd212262` (also contains every ancestor branch in the table)
- `feature/client-sites` at `11881ccde6a4d0ee4992e8ca3b10039f9d49c2f6`
- `deploy/cloudflare-staging-nov03` at `eba521d90c81e669f3821db626f8600586b1ef74`

This lane found those commits only on this private GitLab project. It did not find a second git remote, and it did not create one.

Recommended, after Andrew approves, and not done here:

1. Mirror those three branches to a second private git remote, or take a GitLab project export that includes them.
2. Do not push that mirror to a GitHub repository until Andrew names the destination and confirms it is usable. Older documents in this repo name `andrew12makar-commandcenter/command-center`. This lane did not query GitHub or Vercel.
3. Keep the mirror to git history. Do not add `.env.local`, a service-role key, or a Vercel token. In the application tree, `.env.example` leaves `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `PAGESPEED_API_KEY` empty.

`docs/GENERATOR_SPRINT_STATE.md` says the protected set includes the original Mac `command-center`, a local backup, and a stash. This lane did not inspect that machine. Whether that copy still exists is unknown / to confirm.

Recorded in the lane brief and not re-verified from Vercel, Supabase, or a backup store by this lane:

- Vercel still tracks a suspended GitHub repository.
- The Supabase backend mapping is unverified.
- There is no commercial code backup.

## Merge request checks

`.gitlab-ci.yml` runs only on merge requests: `npm ci` from `package-lock.json`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`. The image is `node:24.22.3-bookworm`, matching the major version in `.nvmrc` (`24`) and the Node.js version used for the local run recorded in `coord/receipts/L5-cc-ci.md`.

No deploy stage. The variables in the "Environment variables for the production build" comment at the top of `.gitlab-ci.yml` are the complete CI environment this lane added. Supabase and Vercel credentials stay unset, so the build does not use stub URLs or stub keys.
