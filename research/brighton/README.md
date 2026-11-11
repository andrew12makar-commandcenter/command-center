# Brighton public fact sheets

Research pass for six Brighton businesses on 2026-11-11. No site was built. Nobody was contacted. No image file was downloaded. Google Maps was not scraped.

Brighton Barbers, 8 Chestnut Hill Ave, already has an internal demo. It is outside this pass. The sprint rule is that no other site is built until Andrew gives feedback on that demo.

Each business has:

- `<slug>.json` — machine-readable facts. Schema: `fact-sheet.schema.json` (`brighton-public-fact-sheet/v1`).
- `<slug>.md` — the same facts, each with a source URL and the access date.

A positive claim in the JSON has at least one `sources` entry (`url`, `accessed`, `excerpt`). Empty arrays mean this pass did not retrieve that kind of fact. `researchTarget` repeats the sprint brief and is labeled as not a public-source confirmation. `unknown` entries use the phrase `unknown / to confirm`.

Validate with:

```bash
node --test research/brighton/fact-sheet.test.mjs
```

`tests/brighton-public-fact-sheets.test.mjs` loads that file so `npm test` runs it too.

## Data gaps

| Business | What this pass could cite | What blocks a content pack |
| --- | --- | --- |
| Johnny D's Fruit and Produce | Address 381 Washington Street and phone 617-254-0500 agree across Brighton Main Streets, Loc8NearMe, and OpenStreetMap. Category is a greengrocer / produce shop. Facebook's public description says fresh fruit and produce. Loc8NearMe and OpenStreetMap agree on Monday, Wednesday–Friday 8:00–18:00, Saturday 8:00–15:00, Tuesday and Sunday closed. | Hours are directory and community-map data (`check_date` 2026-07-17), not an owner schedule. A 2017 CBS article is the only biography and says there was no website then. Yellow Pages returned HTTP 403. Cash-only is disputed. No email, no current product list, no photo permission. |
| Classic Barber Shop | Address 379 Washington Street. Booksy and Fresha agree on Monday–Saturday 9:30 AM–7:00 PM and Sunday 10:00 AM–4:00 PM. Booksy publishes 11 priced services. Fresha publishes four unpriced names, including head shave and hot towel shave. | Phones disagree: Brighton Main Streets `617-202-5837`, Fresha `(617) 208-7099`. The two service lists disagree. The Google `business.site` link returns 404. Instagram and Facebook stopped at login pages. Staff photos have no display permission. |
| Zisis Convenience Store | Address 375 Washington Street. Brighton Main Streets category is Food and Drink, Shopping, under the title Zisi's Convenience. Loc8NearMe says convenience / variety store, every day 8:00 AM–8:00 PM, phone `(617) 785-2938`. One directory photo URL. | Phone on Brighton Main Streets is `617-562-0400`. Spelling differs. No website, social profile, email, or product list. Hours come from one third-party directory. Waze returned HTTP 403. |
| Ensueno Skin Care | Address 353 Washington Street and phone 617-783-2100. Booksy hours Monday–Friday 10:00–18:30 and Saturday 12:00–15:00, plus a Today row of 10:00 AM–06:30 PM on 2026-11-11. Booksy publishes a priced service list, names Luz Egdahl, and says no walk-ins. SinglePlatform includes unit #1. | Sunday is absent. Unit #1 is only on SinglePlatform. Facial price is 100 USD on Booksy and Micro/Facial is 90 USD on SinglePlatform. Five Botox prices do not say what they cover. No owner website. Instagram stopped at login. Yellow Pages returned HTTP 403. |
| Oliveira Deli Market | First-party site `https://oliveiradelimarket.com/` identifies Loja Brighton at 243 Faneuil St, phone `(617) 987-0191`, Monday–Saturday 6:30–21:00 and Sunday 6:30–16:00. Restaurantji matches those hours. The page describes a butcher counter, Brazilian groceries, and money transfer. Facebook's public category line says Butcher Shop. | Apple Maps hours are 7:00 AM–9:00 PM and Sunday 7:00 AM–4:00 PM. Nextdoor spells the name Oliveriras Deli Market Inc and links a `business.site` URL that returns 404. No prepared-food menu was retrieved. Grubhub and Seamless returned interstitials. The homepage names a Framingham store without an address. Photo permission is open. The food-license CSV has no row at this address. |
| Outluks Hair Studio | Brighton Main Streets has no matching listing. Nominatim returned no place. The food-license CSV has no row at 245 Faneuil. StyleSeat's HTML for the OUTLUKSHAIRSTUDIO path did not name a business. `outluckshairstudio.com` did not resolve. | Category, address, phone, hours, services, prices, website, and photos are unknown / to confirm. Yelp, Yellow Pages, Cylex, and another salon directory returned HTTP 403. There is not enough sourced copy to generate a page. |

## Content checklist for the generator

`lib/site-blueprint.ts` blocks publication until these exist. This pass does not satisfy them for any of the six. Leave `factStatus` as `unreviewed`. Do not set `owner_approved`. Any internal concept keeps the sentence `Internal concept, not endorsed by the business` and stays noindex.

1. **Name.** Use the sourced spelling. Zisis / Zisi's and Oliveira / Oliveriras are unresolved.
2. **Category.** Needed for imagery. Use only a sourced label. Outluks has none.
3. **City.** Brighton, MA, only where a sourced address says so. Outluks has no sourced address.
4. **Phone.** One number, after the owner picks it where the sheets show two.
5. **Email.** Unknown / to confirm for all six. Do not invent one.
6. **Address.** Include unit #1 for Ensueno only after the owner confirms it. Keep the Lowell phone off the Oliveira Brighton page.
7. **Hours.** Omit the block until the owner confirms. Directory agreement is recorded and is still not an owner schedule. Apple Maps disagrees with Oliveira's own site.
8. **Services.** `services[]` may contain sourced names only, with a maximum of eight in the current blueprint cleaner. Do not merge the Classic Barber Booksy and Fresha lists. Do not turn Booksy group labels, Apple Maps amenities, or Loc8NearMe tips into services. Do not invent an Outluks or Zisis menu.
9. **Prices.** Booksy and SinglePlatform prices are source text. Do not print them until the owner confirms. SinglePlatform says its prices can change.
10. **About.** Needs an owner-approved, business-specific statement. Do not use the 2017 CBS biography, Loc8NearMe's review-style about text, homepage quotes, or the Google review widget.
11. **Primary action.** Keep a sourced booking or contact path. Classic Barber's Booksy page has a ReserveAction on that same URL. Ensueno's Booksy page says no walk-ins. Oliveira's homepage links `tel:+16179870191` and `https://wa.me/16179870191`. Do not send those anywhere else. Outluks has no confirmed booking URL.
12. **sourceUrl.** Point at the page the owner accepts as the source. A 404 `business.site` URL is not that source.
13. **Images.** Every URL in `photos` is reference only. `heroTreatment` stays `typographic` until an approved hero exists. The Fresha barbershop image is a placeholder. The Nextdoor Oliveira image is the site's default placeholder.
14. **Reviews.** Star counts were visible on some pages. They are not copy.
15. **License absence.** The Active Food Establishment Licenses CSV had no row for these six names or street numbers. Do not describe a business as unlicensed from that absence. Barbers and skin-care studios are outside that file.

Per-business `generatorMustNot` in the JSON repeats the constraints that apply to that sheet.
