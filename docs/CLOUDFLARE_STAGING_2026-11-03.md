# Cloudflare staging plan and verified account map (2026-11-03)

> Scope: for-profit **Business Command Center**; separate from Campus2Care's production application and separate from Circle venue. All changes on this branch are documentation-only and must not be treated as a successful deployment.

## Verified connections and blockers

- Business GitHub repository: `andrew12makar-commandcenter/command-center`; `main` has not received the draft integration releases.
- Source starting point for this branch: `integration/release-candidate-oct14`. Other open unmerged PRs #1, #2, #4 contain distinct work; complete reconciliation and exact-head CI before production.
- Cloudflare account: `President@campus2care.org's Account`, ID `b59aa5ac6c8e63a689134cfec989938e`. Use only for authorized deployments. No Command Center Worker deployed yet.
- Cloudflare Pages project for **Circle**, not for Command Center: `circle-venue-preview`, assigned `circle-venue-preview.pages.dev`. It was created empty. `circle.campus2care.org` has been **registered as a pending custom domain**, but DNS and verification are not complete. Cloudflare Access/Zero Trust is not yet enabled; do not upload private venue panoramas or allow public asset access.
- `campus2care.org` is on a separate, existing Vercel project; its authoritative DNS is `dns1.registrar-servers.com` / `dns2.registrar-servers.com`. This Cloudflare account does **not** own a zone for the apex. Never change apex/www/MX/TXT records or nameservers for a preview.
- Intended authenticated dashboard hostname: `commandcenter.campus2care.org`. It is **not configured**. Cloudflare Workers custom-domain route normally requires a zone on Cloudflare. Do not assume a CNAME to `*.workers.dev` is valid; use an authenticated `*.workers.dev` preview until custom domain routing is verified without disrupting existing DNS.
- Domain and Circle custom-domain DNS must be implemented only by the authoritative DNS manager after an existing-record audit. For Circle Pages, configure `circle` CNAME to `circle-venue-preview.pages.dev` only after domain association and preview access are secured.

## Minimum viable release of Command Center on Cloudflare Workers

1. **Preserve existing features.** This is a full-stack Next.js 16 + Supabase SSR/RLS application, not a static site. Do not use a static Pages upload for Command Center.
2. **Select a reproducible source head** by reconciling the remote branches under review; document the exact commit. Do not merge unrelated half-complete code. Preserve current Mac working tree and database state.
3. **Run existing CI** (unit tests, typecheck, lint, production build, browser tests) at the exact deployment SHA.
4. **Cloudflare runtime compatibility spike on a separate branch.** Cloudflare docs currently recommend `vinext` for Next.js on Workers, but it is beta: use `npx vinext check`, compare with OpenNext only if blockers arise, and avoid irreversible Next.js rewrites. Use a temporary Workers project and a staging URL; do not set a custom domain yet.
5. **Use isolated staging Supabase credentials**, not the nonprofit database or service-role keys in browser code. Check auth callbacks, secure cookies, protected routes, organization RLS, migration status, file uploads, and server-side fetches. Confirm database project ID and migration plan before changing SQL.
6. **Protect the dashboard.** Application-level authentication is required; optionally apply Cloudflare Access after the account's owner enables Zero Trust. No public/anonymous lead or prospect database exposure.
7. **Reproduce the end-to-end workflow:** login, dashboard, CRM, discovery, evidence review, demo generation, revision/feedback, independent export, logout. Check iPhone viewport and actual latency, not just build success.
8. **Only after passing release gates:** make an approved custom-domain plan. Cloudflare Workers custom domains require a managed zone; do not change the whole nonprofit domain's nameservers for this project. A separate owned business domain or `workers.dev` is safer until fully verified.

## Circle project follow-up

1. Establish a dedicated **private Circle repository** under the business GitHub account, preserving Ryan's source and asset provenance.
2. Cloudflare Pages project `circle-venue-preview` is currently Direct Upload, without a Git repository connection. For true branch previews either use a separately configured native Git-integrated Pages project or GitHub Actions + Wrangler direct-upload deployments with scoped secrets.
3. Enable Cloudflare Zero Trust/Access and verify *all relevant* `pages.dev` and custom hostname paths are restricted before uploading any private, potentially identifiable venue imagery.
4. Keep `core/`, `rooms/bar`, `rooms/speakeasy`, `rooms/kitchen`, and `transitions/` modular. Existing bar and speakeasy imagery is photo-based depth, not proven full Gaussian Splat. Restaurant menu and full panorama are not provided; maintain a labeled placeholder.
5. No ticketing, payments, public marketing, or client-facing factual claims before venue, restaurant, and organizer approval.

## Current authorization and next action

The owner has approved starting the setup and creating safe isolated preview infrastructure. They have **not** supplied production launch or payment authorization. In-app sign-in/connection is strongly preferred over sharing passwords, DNS exports, or private keys.

**Human action required now:** Sign in to the Cloudflare dashboard with the connected account and enable **Zero Trust / Access**, then configure a precise email allowlist for the project previews; separately create the dedicated private Circle GitHub repo using the verified business account. DNS records come after verified preview deployments.

**Never claim a live URL until a deployment has been uploaded, is responding, and is visibly tested.**