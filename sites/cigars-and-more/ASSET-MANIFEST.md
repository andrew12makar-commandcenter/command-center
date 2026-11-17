# Asset manifest: Cigars & More

Status on 2026-11-17: **none of the nine source files were reachable from the build environment**
(not in the repository, the session uploads folder, or the connected Google Drive). Every slot
below currently shows a labeled "Photo pending" panel. No stock, generated or borrowed imagery is used.

Provenance for all files: original photos and videos taken at the store (asset priority 1).

| Source | Kind | Content (from brief) | Used in (slot) | Treatment |
|---|---|---|---|---|
| IMG_2013.jpg | photo | Night storefront, red CIGARS & MORE sign, brick, glass windows, bench | `hero` (desktop + 4:5 mobile crop), Visit section | Restrained levels/WB only. Crop must keep the sign; do **not** show the separate commercial-space ad higher on the building (crop it out or keep it unreadable) |
| IMG_2014.mov | video | Glass display cabinetry, several angles | `glass-clip` (muted, play on request), `glass-still` (store intro) | ≤14 s, 720p H.264, no audio, poster frame |
| IMG_2015.jpg | photo | Decorative glass display, close-up | `glass-1` (gallery feature) | Restrained correction |
| IMG_2016.jpg | photo | Glass display | `glass-2` | Restrained correction |
| IMG_2017.jpg | photo | Accessories and shelf merchandise | `accessories` | Restrained correction |
| IMG_2018.mov | video | Cigar cabinets, several angles | `humidor-1`…`humidor-4` (sharpest frame in each quarter of the clip) | Stills only; candidates + contact sheet in `media-work/` |
| IMG_2019.jpg | photo | Cigar cabinet and wood display detail | `humidor-5` | Restrained correction |
| IMG_2020.jpg | photo | Cigar cabinet | `humidor-6` | Restrained correction |
| IMG_2021.mov | video | Interior shelving | `shelves-clip`, `shelves-still` (store intro) | As IMG_2014 |

Outputs per photo slot: WebP + JPEG at 800/1600/2400 px wide (never upscaled). The pipeline writes
`media-work/asset-report.json` with the measured dimensions, durations, codecs and the chosen frame times.

## After the pipeline runs, review by eye
1. Open `media-work/contact-IMG_2018.jpg` and confirm the four picked frames are the clearest distinct angles.
   To override, create `media-selection.json`: `{ "IMG_2018.mov": [1.2, 4.8, 9.0, 13.5] }` (seconds).
2. Check the mobile hero crop keeps the whole sign readable. Adjust with
   `{ "focal": { "hero": [0.5, 0.35] } }` in the same file (x, y as 0–1).
3. Rename the Humidor scene labels in `site/media-plan.js` to match what each frame actually shows,
   and add `hotspots` only for things really visible in the photo.
4. Confirm nothing in any image misrepresents the store (other businesses' signage, people's faces, prices).
