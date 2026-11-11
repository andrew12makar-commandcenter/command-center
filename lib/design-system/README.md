# Small-business design system

Reusable sections and tokens for internal concept sites. The generator does not import this package yet. Wire it from the generator lane; do not copy these rules into ad-hoc markup.

```ts
import {
  renderSite,
  renderSiteFragment,
  renderDesignSystemCss,
  priceLabel,
  visibleReviews,
  BUSINESS_CATEGORIES,
  THEMES,
  TYPE_SCALE,
  SPACE,
  INTERNAL_DISCLAIMER,
  TO_CONFIRM
} from './lib/design-system/index.ts';
```

`DESIGN_SYSTEM_VERSION` is `1`.

## What a page includes

`renderSite(site)` returns a full HTML document:

- self-hosted CSS from `renderDesignSystemCss()`
- hero, services or menu, gallery (only when images are valid), about, hours and location, reviews (only when attributed), booking, footer
- a skip link, one `h1`, section `h2`s, and item `h3`s
- `noindex, nofollow, noarchive`

`renderSiteFragment(site, { embed: true, headingBase: 2, idPrefix })` returns the same body for embedding under another page `h1`. Give each copy its own `idPrefix`.

Individual sections (`renderHero`, `renderServices`, `renderGallery`, `renderAbout`, `renderHoursLocation`, `renderReviews`, `renderBooking`, `renderFooter`) are available when the generator must place them in its own order. A hand-built page still has to include the stylesheet, a `[data-theme]` root, and `renderFooter` (the disclaimer lives there).

## Tokens

`BUSINESS_CATEGORIES`: `barber`, `produce-market`, `convenience`, `skin-care`, `deli`, `hair-studio`.

`THEMES[category]` supplies the color pairs, card radius, display weight, and motion temperament (`editorial`, `calm`, or `precise`). `TYPE_SCALE` and `SPACE` are the shared type and spacing scales. Both are written into the stylesheet as CSS variables.

Text pairs are meant to clear WCAG AA (`4.5:1`). `themeContrastFailures(theme)` lists any pair that does not.

## Missing facts

| Input | Rendered result |
| --- | --- |
| Price `null`, blank, or longer than 80 characters | `to confirm`. The supplied string is never rewritten into a new price. |
| Service list `null` or empty | The section stays, with the category label plus `to confirm`. No service names are added. |
| Hours, address, phone, or email empty | `to confirm` in that row. |
| About body empty | `to confirm`. |
| Booking link missing or not `http(s)`, `tel`, `mailto`, or a same-page hash | `to confirm`. `javascript:` and `data:` links are dropped. |
| Gallery image missing `alt`, or with an unsafe `src` | That image is dropped. If none remain, the gallery section is omitted. |
| Review missing `quote`, `author`, or `source` | That review is dropped. If none remain, `renderReviews` returns an empty string. |

Use `priceLabel`, `visibleReviews`, `visibleMenu`, and `visibleImages` if the generator needs the same decisions before layout. Do not invent prices, hours, services, or testimonials to fill a layout.

Caps, so a bad payload cannot dump unbounded markup: 24 menu rows, 12 gallery images, 12 reviews. A note says when the cap is hit.

## Internal concepts

Every footer includes this exact sentence:

`Internal concept, not endorsed by the business`

The banner repeats it. There is no flag to remove either line, and this package does not accept or set an owner-approval field. Full documents are `noindex`.

## Fonts, motion, and trackers

Font files live in `lib/design-system/fonts/` (Fraunces and Source Sans 3, SIL OFL; license text is beside the files). Pass a relative `fontBase` if the HTML is not next to that directory. Absolute and remote bases throw.

Hero motion is a short rise and reveal. Under `prefers-reduced-motion: reduce`, animations are removed and the hero stays visible. The stylesheet has no `@import`, no `fonts.googleapis.com`, and no analytics.

## Category themes

Set `site.category`. The fragment root carries `data-theme` and `data-motion`. Structural headings ("Menu" for deli, produce market, and convenience; "Services" otherwise) are labels, not claims about what the business sells.

## Preview

The static gallery is `qa/design-system/preview.html`. Rebuild it after token or markup changes:

```bash
node --experimental-strip-types qa/design-system/build-preview.ts
```

Everything on that page is example data.

## Generator lane

Suggested wiring, not done in this package:

1. Map researched facts into `DesignSite`. Leave unknown fields `null`.
2. Pass reviews only when each one has a real quote, author, and source.
3. Call `renderSite` for a standalone internal export, or `renderSiteFragment` plus `renderDesignSystemCss` inside an existing shell.
4. Copy `lib/design-system/fonts/` and point `fontBase` at it.
5. Keep the existing owner-approval gate in the exporter. This library cannot mark a page as approved.
