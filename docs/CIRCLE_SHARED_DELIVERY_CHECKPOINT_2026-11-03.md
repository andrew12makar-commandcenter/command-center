# Circle Tavern in Command Center — shared project checkpoint

Updated 2026-11-03. **Review branch only. Do not merge or deploy without owner sign-off.**

## Separation of responsibilities
- **Command Center:** joint Andrew/Ryan project dashboard, source-of-truth links, approval stages, commits, PR tracking and work ownership. Lives in Andrew's private business app. Ryan's actual Command Center user account/membership and permissions have **not** been independently verified. Do not claim he can log in yet.
- **Circle website:** separate repo `andrew12makar-commandcenter/venu`, Cloudflare Pages project `venu`, production `https://venu-e60.pages.dev`. Keep separate from Command Center's Vercel deployment and Campus2Care nonprofit systems. No production changes authorized.
- **Current HD development:** `feature/circle-hd-3d-foundation-v1`, draft [Circle PR #3](https://github.com/andrew12makar-commandcenter/venu/pull/3). Canonical `docs/ANIMATION_STATE.md` and `docs/START_HERE_CIRCLE_HD.md` on that branch. Exactly entrance, bar, speakeasy. Gyro Theory is a different site.

## Current verified hosting
- Cloudflare personal account `f59f889716766c3eed7a40383e61102a` has **Standard private** R2 bucket `circle-hd-founder-preview-20261103`. Private bucket created successfully, test object uploaded; original source model upload **not yet complete**.
- An earlier KV namespace `circle-private-3d-review-temp` contains a **partial** experimental main-bar transfer; it is not the final model.
- Latest confirmed Pages successful build of the HD branch: `https://f3fcd0ce.venu-e60.pages.dev/immersive/` (deployment status: success). **This is NOT a working real-3D preview** because the original `.sog` assets have not been uploaded/connected. Code falls back to photographs; no verified 3D GPU QA.
- Previous photo-only Worker `circle-cinema-review.andrew12makar.workers.dev` was rejected by the owner; do not use its look as the reference.
- Founder-only Access application for proposed private preview hostname `circle-hd-private-review.andrew12makar.workers.dev` exists, limited to two founder-owned accounts. This **does not yet verify** that the final R2-bound preview Worker is protected or running.
- Both authentic models are preserved in the prior conversation's 47 MB private test ZIP: `main-bar.sog` (SHA256 `40450dbeceaf6650205ea740067e7fba2246a5ddf4045ef252c2dd4162563e50`) and `speakeasy-360.sog` (`68034b4809a86eb521f9abe3250145af33a39aaadc91651d940629c8c67c9321`). Never put them into the public Git repo.
- Production Command Center previously identified as `command-center-rouge-nine.vercel.app` and has not been changed in this task.

## Next gated work
1. Upload both full model files to the private bucket with integrity/size/hash readback, using a reliable authenticated binary upload mechanism. Avoid repeated large in-chat base64 transmissions and duplicate paid generation.
2. Create a separate Worker with a private R2 binding, route models only after Cloudflare Access authentication is enforced. Verify policy against anonymous access before sharing the URL. Do not configure public bucket access.
3. Confirm actual PlayCanvas WebGL rendering using both `.sog` files; test on real iPhone and desktop GPU, inspect geometry fidelity, motion boundaries, loading and fallback. No claim of cinematic HD completion without this test.
4. Verify Ryan's individual Command Center member account/permissions and configure least-privilege access for joint projects if expressly authorized. Keep the current command center read-only client-site tracker until access is confirmed.
5. Obtain owner sign-off of authenticated preview. Only afterward plan the next cinematic-motion layer. Require distinct approval for any merge to main, production publish, spending, paid generation or changing payments.

## Audit / collaboration rule
Every project update must preserve source files, update branch checkpoint docs and include commit SHA, test evidence, exact stage, ownership and next action. Never restart from scratch when a verified branch exists.

**Current stage:** Circle HD S01 built; private cloud asset connection and actual GPU acceptance blocked. Command Center collaboration entry updated on branch `feature/circle-shared-project-tracking-nov03`, not released.
