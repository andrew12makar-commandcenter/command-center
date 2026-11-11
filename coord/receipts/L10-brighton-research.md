# Receipt L10-brighton-research

- Lane id: L10-brighton-research
- Goal: research only for six Brighton businesses. Write sourced fact sheets, a JSON schema, and a test. Do not build a site, contact anyone, or download photos.
- Base branch: integration/release-candidate-oct14
- Head branch: cursor/brighton-research-4b6b
- Access date for every retrieved page: 2026-11-11

Brighton Barbers (8 Chestnut Hill Ave) was not researched and no site was built. The sprint rule stands: no other site is built until Andrew gives feedback on the existing internal demo.

## VERIFIED

Commands were run from `/workspace` unless noted. Page bodies were saved under `/tmp/lane10` and were not committed.

Fact-sheet test, after the JSON and Markdown were generated:

```text
node --test research/brighton/fact-sheet.test.mjs
# tests 3
# pass 3
# fail 0
```

Same three tests through the `npm test` wrapper:

```text
node --test tests/brighton-public-fact-sheets.test.mjs
# tests 3
# pass 3
# fail 0
```

The wrapper exists so the existing `npm test` glob `tests/*.test.mjs` loads the lane test. `package.json` was not edited.

Retrieved pages that contributed facts (HTTP status from curl, 2026-11-11):

- `https://brightonmainstreets.org/shops/` — 200, 884,328 bytes. HTML has shop links for Johnny D's, Classic Barber Shop, Ensueno, and Zisi's Convenience (`/shops/zsis-conveince/`). No Outluks and no 245 Faneuil string.
- Detail pages for those four shops — 200. Addresses, phones, and categories quoted in the fact sheets were read from the HTML.
- `https://booksy.com/en-us/177047_classic-barber-shop_barber-shop_22412_boston` — 200. JSON-LD hours, 11 priced offers, staff names, and description were parsed from the saved HTML.
- `https://www.fresha.com/lvp/classic-barber-shop-washington-street-boston-lRwqM` — 200. Next.js `liteLocation` has phone `(617) 208-7099`, working hours, and four unpriced treatments. `websiteUrl` is empty. Gallery URL is a Fresha placeholder.
- `https://website-1230933097149659479132-barbershop.business.site/` — 404, title `Error 404 (Not Found)`.
- `https://booksy.com/en-us/620627_ensueno-skin-care_aesthetic-medicine_22412_boston` — 200. JSON-LD hours and offers, visible group labels, `Skin Tags Varies 1h 15min`, and the Today row `10:00 AM` / `06:30 PM` were in the HTML.
- `http://places.singleplatform.com/ensueno-body--skin-care/menu` — 200. Address includes `# 1`, phone `617-783-2100`, Micro/Facial `$90.00`.
- `https://oliveiradelimarket.com/` — 200. Loja Brighton address, phone, and `Seg a sáb, 6h30–21h · Dom, 6h30–16h` are in the visible text.
- `https://maps.apple.com/place?place-id=I51CC7BEDC8FE7813` — 200. Hours Mon–Sat 7:00 AM–9:00 PM, Sunday 7:00 AM–4:00 PM, phone `+1 (617) 987-0191`.
- `https://www.restaurantji.com/ma/brighton/oliveiras-deli-market-/` — 200. Hours Monday–Saturday 6:30AM–9PM, Sunday 6:30AM–4PM.
- `https://www.restaurantji.com/order.php?id=6036354` — 200. Name, 243 Faneuil Street, and `(617) 987-0191`. No DoorDash, Grubhub, or Uber Eats URL in the HTML.
- `https://nextdoor.com/pages/oliveiras-deli-market-brighton-ma/` — 200. JSON-LD name `Oliveriras Deli Market Inc`.
- `https://oliveiras-deli-market.business.site/` — 404.
- `https://www.facebook.com/p/Johnny-Ds-Fruit-and-Produce-100068090161218/` — 200. `og:description` includes `The freshest fruit and produce in Brighton.`
- `https://www.facebook.com/Oliveiradelimarket/` — 200. `og:description` includes `Butcher Shop`.
- `https://www.cbsnews.com/boston/news/best-places-for-fresh-fruit-in-boston/` — 200. `datePublished` `2017-07-04`.
- `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&extratags=1&q=Johnny%20D%20Fruit%20Produce%20381%20Washington%20Street%20Brighton` — 200. Node 10175697959, `opening_hours` `Mo,We-Fr 08:00-18:00; Sa08:00-15:00`, `check_date` `2026-07-17`.
- Loc8NearMe Johnny D's and Zisis pages — 200. Phones, hours, and the cash-only about sentence were in the HTML.
- `https://data.boston.gov/api/3/action/package_show?id=active-food-establishment-licenses` — 200.
- The CSV resource from that payload — 200, 537,710 bytes, 3,357 data rows. No row for these six names and no 02135 row at 381/379/375/353 Washington or 243/245 Faneuil.

Failed or empty retrievals recorded in the fact sheets:

- Yellow Pages Johnny, Ensueno, and Outluks — HTTP 403.
- Waze Zisis — HTTP 403.
- Yelp, Cylex, and beautynailhairsalons.com for Outluks — HTTP 403.
- Restaurantji Oliveira menu — HTTP 403.
- Grubhub and Seamless Oliveira URLs — HTTP 200 interstitials with no menu.
- `outluckshairstudio.com` and `www.outluckshairstudio.com` — DNS did not resolve (`curl` exit 6).
- StyleSeat `https://www.styleseat.com/m/v/outlukshairstudio` — HTTP 200, final URL uppercase, generic StyleSeat shell, zero occurrences of `outluk` or `faneuil` in the HTML.
- Instagram profile fetches for Classic Barber, Ensueno, and Oliveira redirected to a login page.
- Facebook fetches for Classic Barber and the numeric Outluks URL redirected to a login page.
- Nominatim queries for Oliveira, Outluks, and Ensueno returned `[]`. The Zisis query returned HTTP 429 and the Classic Barber query returned HTTP 503, so those two were not used.

No image bytes were saved. Photo fields are URLs only.

A later status re-check of the main cited URLs, using `curl -sS -o /dev/null -L --max-time 20 -w "%{http_code}"`, returned the same codes: Brighton Main Streets detail pages 200, both Booksy pages 200, Fresha 200, Classic Barber `business.site` 404, `oliveiradelimarket.com` 200, Oliveira `business.site` 404, Apple Maps 200, StyleSeat 200, SinglePlatform 200.

## CLAIMED-but-unverified

Older notes in `docs/` mention Google Maps review counts, a Yellow Pages link from Johnny D's to Johnny's Selected Seeds, Waze hours for Zisis, and Yelp or StyleSeat details for Outluks. Those pages were not re-read successfully on 2026-11-11, so they are not current facts in these sheets.

The StyleSeat path contains the string OUTLUKSHAIRSTUDIO. The HTML did not identify the business. That URL is not a confirmed booking link.

`outluckshairstudio.com` failing DNS does not prove the studio never used the name. No fetched page tied the hostname to the studio.

Absence from the food-establishment CSV does not prove a business is unlicensed or closed.

## Blockers

- Outluks has no sourced category, address, phone, hours, services, or photos. A page cannot be generated from this pass.
- Classic Barber has two phones and two service lists.
- Zisis has two phones and two public spellings. Hours come from one directory.
- Ensueno's unit number and Sunday hours are unresolved, and the facial prices disagree.
- Oliveira's own site and Restaurantji agree on hours; Apple Maps does not.
- Photo display permission is unknown for every image URL.
- Owner confirmation is required before `factStatus` can move past `unreviewed`. This lane did not set `owner_approved`.

## needs-other-lane

- `package.json` and `.github/workflows/ci.yml` were not edited. CI `pull_request` runs only for base `main`, and this branch name is not in the workflow `push` list, so opening the draft MR does not by itself run GitHub Actions. The fact-sheet test is wired into the local `npm test` glob through `tests/brighton-public-fact-sheets.test.mjs`.
- No site scaffold, blueprint, or demo was created. A later generator lane can read `research/brighton/*.json` after Andrew's Brighton Barbers feedback. It should follow `research/brighton/README.md` and each file's `generatorMustNot`.
- Google Maps was not opened, consistent with `docs/OPEN_SOURCE_INTEGRATION_DECISIONS.md`.

## Suggested next step

Wait for Andrew's feedback on the Brighton Barbers demo. Then confirm, with the owner, one phone, one hour schedule, and the service names before any of these six sheets becomes a blueprint. Outluks needs a rendered public page that actually names the studio before any copy is written.
