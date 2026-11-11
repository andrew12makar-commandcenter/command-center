# Receipt L5-cc-ci

- Lane id: L5-cc-ci
- Goal: add a merge-request GitLab CI pipeline (lockfile install, lint, typecheck, unit tests, production build) with no deploy stage and no secrets, and write a factual branch map plus a default-branch and backup recommendation for Andrew to approve.
- Base branch: `integration/release-candidate-oct14` (`c6219dfb2e6f53f0915c626555ec0919fd212262`)
- Working branch: `cursor/gitlab-mr-checks-30bc`
- Paths touched: `.gitlab-ci.yml`, `docs/repo-state.md`, `coord/receipts/L5-cc-ci.md`
- Project settings, default branch, and application code: not changed.

## VERIFIED

### Git facts

- `git fetch origin --prune` completed. `origin` is `gitlab.com/andrew-makar-personal-projects-group/command-center`.
- `git rev-parse main integration/release-candidate-oct14 origin/main origin/integration/release-candidate-oct14` all matched the SHAs in `docs/repo-state.md`.
- `git ls-remote --tags origin` printed no tags.
- GitLab `get_project` for `andrew-makar-personal-projects-group/command-center`: id 88765146, default branch `main`, visibility private.
- GitLab `list_pipelines` before this merge request: empty list.
- Branch ancestry, file counts, and the two descendant diffs are the commands summarized in `docs/repo-state.md`. `feature/client-sites` head is `11881ccde6a4d0ee4992e8ca3b10039f9d49c2f6`.

### Local checks (Node.js v24.22.3, npm 11.19.1)

Node came from `https://nodejs.org/dist/v24.22.3/node-v24.22.3-linux-x64.tar.xz` unpacked at `/tmp/node-v24.22.3-linux-x64`. The system Node was v22.23.4 and was not used for these commands. Working directory `/workspace` on `integration/release-candidate-oct14` before the CI commit (application tree `c6219dfb2e6f53f0915c626555ec0919fd212262`).

| Command | Result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Exit 0. `added 590 packages in 9s`. npm warned that `unrs-resolver@1.12.2` postinstall is not covered by `allowScripts`, and that `eslint@9.39.5` is deprecated. Install still finished. |
| `npm run lint` | Exit 0. ESLint reported 14 warnings and 0 errors (`components/site-industry-sections.tsx`, `components/site-renderer.tsx`, `postcss.config.mjs`). |
| `npm run typecheck` | Exit 0. `tsc --noEmit` produced no errors. |
| `npm run test` | Exit 0. TypeScript suite: 287 pass, 0 fail. `.mjs` suite: 41 pass, 0 fail. |
| `npm run build` (first) | Exit 1. Next.js 16.4.0 compiled, then threw `SecurityFatalError` and told the agent session to retry. This was the agent upgrade nudge in `node_modules/next/dist/lib/upgrade/nudge.js`, which throws only when `getAgentName()` returns an agent. It is not a type or compile error. |
| `npm run build` (retry) | Exit 0. Next.js 16.4.0 printed that the command was continuing after the upgrade reminder, generated 19 static pages, and listed the app routes. |

Build environment: `NEXT_TELEMETRY_DISABLED=1`, `CI=1`, and `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `PAGESPEED_API_KEY` unset. No stub URL or stub key was required. No Vercel CLI and no Supabase CLI were invoked.

The first GitLab job image was `node:24.22.3-bookworm`. That tag is not on Docker Hub. The job image is now `node:24.22.2-bookworm`, the newest Node 24 Bookworm tag returned by `https://hub.docker.com/v2/repositories/library/node/tags?page_size=100&name=24` on 2026-11-11. This environment has no Docker, so that image was not executed locally.

### Pipeline

Draft merge request: https://gitlab.com/andrew-makar-personal-projects-group/command-center/-/merge_requests/1

Pipeline https://gitlab.com/andrew-makar-personal-projects-group/command-center/-/pipelines/3055739070 (id 3055739070, source `merge_request_event`, sha `16c75aa5f421cd71c6a47198f1b7566484005343`) status `failed`.

Job `mr-checks` https://gitlab.com/andrew-makar-personal-projects-group/command-center/-/jobs/17943937997 failed before any script ran:

`ERROR: Job failed: failed to pull image "node:24.22.3-bookworm" with specified policies [always]: Error response from daemon: manifest for node:24.22.3-bookworm not found: manifest unknown`

Follow-up commit `d8b75ef782ae706f0733b1d59ffbf187e7dc22df` sets the image to `node:24.22.2-bookworm`.

Pipeline https://gitlab.com/andrew-makar-personal-projects-group/command-center/-/pipelines/3055754526 (id 3055754526, source `merge_request_event`, sha `d8b75ef782ae706f0733b1d59ffbf187e7dc22df`) status `success`.

Job `mr-checks` https://gitlab.com/andrew-makar-personal-projects-group/command-center/-/jobs/17944041502 status `success`. From that job log:

- Runner image pulled. `node -v` printed `v24.22.2`. `npm -v` printed `11.19.1`.
- `npm ci --cache .npm --prefer-offline --no-audit --no-fund`: `added 590 packages in 20s`. Same `unrs-resolver@1.12.2` allowScripts warning and eslint deprecation warning as the local install. Exit allowed the next step.
- `npm run lint`: `14 problems (0 errors, 14 warnings)`.
- `npm run typecheck`: `tsc --noEmit` printed no errors, and the job continued.
- `npm run test`: TypeScript suite `tests 287`, `pass 287`, `fail 0`. `.mjs` suite `tests 41`, `pass 41`, `fail 0`.
- `npm run build`: Next.js 16.4.0 compiled successfully, generated 19 static pages. The log has no `SecurityFatalError` and no Supabase or Vercel command. `Job succeeded`.

This receipt edit does not change `.gitlab-ci.yml`. A later pipeline on the receipt commit reruns that same job.

## CLAIMED-but-unverified

- That GitLab shared runners will pick up the merge request pipeline. No pipeline existed yet when `list_pipelines` was called.
- Historical GitHub Actions results cited inside existing docs. This lane did not re-query GitHub.
- Statements inside `docs/CLOUDFLARE_STAGING_2026-11-03.md` (that file is only on `deploy/cloudflare-staging-nov03`). This lane read the file and did not treat its account or DNS claims as freshly verified.
- The lane-brief blockers: Vercel still tracks a suspended GitHub repository; Supabase backend mapping is unverified; there is no commercial code backup. Not re-checked against Vercel, Supabase, or a backup store.
- Whether a Mac working copy or local backup still exists. `docs/GENERATOR_SPRINT_STATE.md` names one. This lane did not inspect that machine.

## Blockers

- None remaining in install, lint, typecheck, unit tests, or the production build. The first pipeline failed only because `node:24.22.3-bookworm` is not a published image. Commit `d8b75ef782ae706f0733b1d59ffbf187e7dc22df` pins `node:24.22.2-bookworm`. Pipeline 3055754526 succeeded.
- Default branch is still `main` (README only). Changing it is waiting on Andrew. Not a CI failure.
- Backup has not been created. Waiting on Andrew. Not a CI failure.

## needs-other-lane

- Next.js `16.4.0` (lockfile; `package.json` says `"next": "^16.1.0"`) reports a known security vulnerability. Upgrading it changes `package.json` and `package-lock.json`, which are outside this lane. Do not treat the first agent-session `next build` exit 1 as an application compile failure. In GitLab CI, `nudge.js` throws that error only when an agent name is detected; a normal runner is not that case. The retry on this machine exited 0.
- Vercel project retarget, Supabase project mapping, GitLab default-branch change, and creating the off-site mirror are outside this lane. Recommendations are in `docs/repo-state.md` and were not executed.

## Suggested next step

Andrew reviews the draft merge request. If its pipeline is green, merge it so later merge requests into `integration/release-candidate-oct14` run these checks. Separately, approve or reject the default-branch sequence and the three-head backup in `docs/repo-state.md`. A dependency upgrade for the Next.js security notice belongs in another lane after Andrew approves it.
