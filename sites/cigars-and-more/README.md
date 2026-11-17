# Cigars & More: The Digital Humidor (demo)

A static, dependency-free demonstration site for **Cigars & More**, built from the store's own photos
and video. Preview only: `noindex`, a visible demo banner, and no store details beyond the sign name
until the verified business brief arrives.

```
site/                  the website (open site/index.html via any static server)
  business.js          the ONE source of business facts (address, hours, phone… all null = pending)
  media-plan.js        which real photo/video fills each spot, alt text, Humidor labels/hotspots
  media/               generated, optimized media + media.generated.js (pipeline output)
scripts/prepare_media.py   media pipeline (ffmpeg + Pillow)
qa/run-qa.mjs          Playwright QA at 390 / 768 / 1440 px + reduced motion, writes screenshots
ASSET-MANIFEST.md      source files, slots, treatment, review steps
```

## Add the real media (the one remaining step)
1. Put the originals in `media-src/` (git-ignored, never modified): `IMG_2013.jpg` … `IMG_2021.mov`.
2. `python3 -I scripts/prepare_media.py`
3. Review `media-work/contact-*.jpg` and the steps in ASSET-MANIFEST.md.
4. `node qa/run-qa.mjs`, then look at `qa/screenshots/`.
5. Commit `site/media/` (originals stay out of git; keep them in Drive).

## Fill in business facts
Edit `site/business.js` only. Each `null` shows as "Pending verification" and turns off whatever
depends on it: no call button without a phone number, no directions link without an address.

## What's on the page
- **Hero:** the real storefront photo. On desktop the text sits in the lower band. On mobile the
  photo goes on top (a dedicated 4:5 crop) with the text below it, so the sign is never covered.
  Buttons: *Visit the Store* (goes to Visit) and *Explore the Interior* (goes to the Humidor).
- **The Store:** descriptive copy about what the photos show. No invented history (`business.story` adds owner-approved text).
- **Digital Humidor:** six real views (four stills from IMG_2018 plus IMG_2019 and IMG_2020).
  Views cross-fade with a direction-aware slide. You can change views with the arrows, the
  thumbnails, the ←/→/Home/End keys, a horizontal swipe or a drag. There is a subtle pointer
  parallax (mouse only) and optional hotspots. Full screen adds zoom (buttons, scroll wheel,
  pinch or double-tap), panning, keyboard shortcuts and Esc to close. Pages scroll normally,
  since the stage uses `touch-action: pan-y`.
- **Interior gallery:** an asymmetric editorial grid that opens into the same full-screen viewer.
  Videos are muted and play only when you start them.
- **Visit:** address, hours and phone (all pending), plus a 21+ notice. The directions and call
  buttons only appear once the data exists.
- **Footer:** an informational-only statement (nothing is sold, shipped or delivered online), the
  age line and the demo attribution.

Motion: CSS transitions plus IntersectionObserver reveals. `prefers-reduced-motion` turns off
transforms, parallax and smooth scrolling. There is no animation library, cart, checkout, age
gate, booking, lounge, 360° claim or autoplay audio.

## Checkpoint (2026-11-17)
| Area | State | Evidence |
|---|---|---|
| Site build (all sections, nav, Humidor, gallery, inspector) | Done | `site/` |
| Media pipeline | Done; verified end-to-end on synthetic test files (not committed) | `scripts/prepare_media.py` |
| QA | 98/98 checks pass with pending media; 101/101 with synthetic test media | `qa/run-qa.mjs`; evidence JPEGs in `qa/evidence/` (full screenshots regenerate into git-ignored `qa/screenshots/`) |
| Real store media | **Blocked:** source files not reachable from the build environment | ASSET-MANIFEST.md |
| Business facts | **Pending** verified brief | `site/business.js` |
| Preview deploy | Not done; no hosting credentials in this environment, and not authorized | — |

## Before any publication
- Confirm the federal, Massachusetts and Boston rules for tobacco retailers' websites (21+ wording;
  whether an age-affirmation screen is wanted).
- Owner approval of every photo, the copy and the business facts.
- Remove the demo banner and `noindex` only after approval.
