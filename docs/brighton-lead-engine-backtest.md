# Brighton lead engine back-test

**Review date:** 2026-10-15  
**Scope:** Brighton-first prospect discovery, online-presence evidence, lead ordering and roleplay usability.  
**Safety:** read-only review of connected sales data. No candidate imports, scans, website checks, Lighthouse runs, status changes, demos or outreach were run against shared CRM records.

## What the current data says

The user-provided 50-business rehearsal reports 3 pursue, 20 research-more, 9 hold and 18 skip. The three pursue decisions were not all website projects:

| Prospect | Potential offer in the rehearsal | What is still unverified |
| --- | --- | --- |
| Nakhon | Independent website beside its Toast order page | Current operation at the address, owner/manager, and whether it has a separate site |
| Beef and Turkey | Website plus a Google listing destination | Current operation, exact business type and decision maker |
| John J. Ryan Insurance Agency | Google Business Profile hours cleanup, not a redesign | Listing control and decision maker |

These are promising conversations from the rehearsal, not outreach-ready leads. The source file is `rehearsal-2-notes.md`; its findings are operator-reported and were not re-verified in this pass.

The government snapshot contains 316 source rows: 146 food-license rows, 154 Licensing Board rows and 16 certified-directory rows. There are 283 coordinate matches and 33 records without coordinates. These are overlapping source rows, not unique, active prospects. The fields do not establish website or Google profile status.

The official Boston City Clerk DBA database is a useful manual cross-check by business name, address, neighborhood, ZIP, business type and filing status. The authenticated Brighton government map now links to it for single-candidate checks. Its search results are not part of the downloaded local CSV, and the record only establishes a filed trade name/address; it does not prove a current storefront or a marketing need. No free bulk export from the City Clerk database was verified. A third-party site reports roughly 43,000 Boston certificates sourced from city open data, but it is not the primary source and may include owners' personal information, so it is not ingested into this prospect pipeline. The Massachusetts full Corporation Book extract is a paid service; it was not used. This keeps the source plan free while making the coverage limit explicit. [Boston City Clerk DBA search](https://www.cityofboston.gov/cityclerk/dbasearch/), [Boston business-certificate requirements](https://search.boston.gov/permitting/permits/business-certificate).

### Roleplay false-negative and address conflict

One of the operator's prior 50-business rehearsal pursuits, **Beef & Turkey Convenience**, is not present by name in the current 1,277-row Overture snapshot. Brighton Main Streets currently lists that name at 290 Washington Street with a public business phone. The downloaded Boston files instead contain active food and Common Victualler records for **Cafe Lava & Bento** at 290 and 290-298 Washington Street. These sources could reflect separate suites, a tenant/name change, or a stale directory. The records do not prove which operator is currently in the storefront, and no exact DBA result was verified. [Brighton Main Streets business directory](https://brightonmainstreets.org/shops/), [Boston active food-establishment data](https://data.boston.gov/dataset/active-food-establishment-licenses), [Boston Licensing Board data](https://data.boston.gov/dataset/licensing-board-licenses).

This is a confirmed discovery-coverage lesson: the map's 1,277 candidates do not contain every local business that appears in the operator's roleplay or neighborhood directory. It is not yet a qualified sales lead. Resolve the identity in the City Clerk's manual DBA lookup and, if still ambiguous, verify the current storefront in person before treating the business as a pitch candidate. The cross-source disagreement stays visible as research, not an automatic merge or a reason to discard the business.

The cached Overture Maps Places release `2026-09-23.1`, queried for the Brighton ZIP envelope, produced 1,277 unique candidate rows from 2,165 source rows. It excluded 888 rows for postcode/out-of-area or non-prospect reasons and flagged 96 candidate records for possible duplicates. The review file is local under `.local-discovery/overture-2026-10-15-order-review/` and was not imported to CRM.

Within those 1,277 candidates:

- 655 have an accepted website URL in Overture. The review-order output counts 441 accepted URLs without a chain, multi-location, institutional, practitioner or missing-category flag. A further 214 accepted URLs sit on rows with one or more of those review flags.
- 311 rows have a website URL that fails the conservative name/domain check. Those rows have no accepted website URL and preserve the suspect URL separately for human review. The 311 are included in the 622 below.
- 622 have no accepted first-party website URL in the source. This means “not recorded here,” not “no website exists.”
- 15 have classified third-party listing or ordering URLs: 10 listing URLs and 5 ordering URLs.

The first Overture list review contained concrete errors: Cafe Mirror pointed to Menuism, Johnny D's Fruit and Produce pointed to Johnny Seeds, and Faneuil Street Market pointed to Ronan's Deli. Nakhon's Toast link is an ordering destination, not an independent company website. The old name heuristic also misread “Brighton Tailor” as a solo clinician.

## Intake defects fixed in this pass

- Classified Toast, DoorDash, Uber Eats, Grubhub and other known order pages separately from independent websites, social accounts and directories. These links cannot be saved as a business website, used as a Lighthouse target, or treated as identity proof.
- Classified Menuism, MapQuest, Foursquare and Allmenus as listings rather than business websites.
- Overture now keeps suspect website URLs in a separate review-only CSV field. A possible mismatch is linked on the intake card but does not populate the website field or imply a confirmed website gap.
- Added approximate straight-line miles from Brighton Center to Overture rows and a “Closest to Brighton Center” intake sort. Distance never means drive time or confirms a storefront.
- Corrected the clinician-name heuristic so ordinary storefront names are not flagged as practitioners. An individual-practitioner clue no longer lowers review order automatically.
- Kept need, target fit, website identity, operation, Maps identity, distance and decision-maker reachability as separate evidence. No score estimates budget, purchase likelihood or revenue.
- Changed the lead queue so a qualifying, evidence-backed gap sorts ahead of a record whose need is still unknown. The UI now calls this a research queue and explains that unknown is not a sales opportunity.

## Small live back-test of “no site recorded” cases

Read-only public-web checks show why the 622 Overture rows without an accepted first-party URL cannot become a 622-lead list:

- **Ensueno Body and Skin Care Clinic**: Brighton Main Streets currently lists its name, 353 Washington Street and phone 617-783-2100. YellowPages also associates a Spanish product-treatment URL with the listing, but the current evidence does not establish that this URL is the local clinic's own website. Result: verify the URL and owner before discussing a website sale.
- **Lessard's Barber Shop**: Brighton Main Streets lists 545 Washington Street and 617-789-4199. A third-party review aggregator reports 4.7 stars and 219 Google reviews, so a local-presence gap is not established. Result: low-priority research, not a website pitch based only on Overture's blank field.
- **Kiki's Laundromat**: Overture and directory results associate it with 249 Faneuil Street. One directory reports 3.3 stars from 32 reviews and no website, while a separate Overture phone field conflicts with a directory that has no phone. Result: identity/contact conflict needs resolution; do not pitch using the disputed number or review content.
- **Oliveira Deli Market**: a local business-data provider lists oliveiradelimarket.com despite Overture returning no accepted URL. This domain still needs a direct identity check, but it is a clear false positive for “no website.”
- **Academy Hill Plumbing**: Overture lists the nearby address but no accepted website and no category. YellowPages/Superpages show a phone number and a “Website” control, while AllBiz says no website is listed. The sources conflict, and none of the checked pages establishes the official domain. Result: a strong manual-research test case, not a qualified website lead or safe contact record.
- **Hoshi Ya Sushi**: Overture has no accepted website URL, but YellowPages names hoshiyaboston.com and a restaurant ordering site has the same address and phone. Current restaurant pages also show an active menu and ordering. Result: no missing-website pitch; the candidate needs no-site rejection and should be checked for any separate Maps/SEO issue before pursuit.
- **LR Hair Salon**: Overture has no accepted URL, while the Brighton Main Streets directory and salon-booking/review services show the business at 591 Washington Street with a booking path and recent reviews. Result: no website-gap claim; potential work would need a specific audit finding, not the empty map field.

These cases support two product rules: preserve candidate URLs that fail identity matching for review, and never translate “no URL in this dataset” into “no website.” Conflicting third-party website controls should trigger an exact-domain identity check, not a positive website or no-website label. A repeatable niche is not proven. Salons, repair/home services, and independent food businesses remain test cohorts, not an assumed specialty.

## Government-to-map back-test and stale-record guard

The read-only Overture review now compares each candidate with the latest downloaded Boston city files. It matches normalized business name plus street number/street, tolerates city formatting such as `380- Washington ST`, and keeps different names at a shared street number separate. City files often omit suites, so address-only results are review clues, not identity matches.

Against the current 1,277-row Overture snapshot, this logic found 78 exact name/street matches, 404 different-name records at the same street number, and 795 candidates with no match in the selected city files. These counts overlap neither with website quality nor sales need; a missing city match does not mean a business is unlicensed or closed. Regression tests cover name/address normalization, address ranges, unit suffixes, trailing punctuation, different names and unknown status.

For food-related categories, the review highlights records without a name/street match in Boston's active food-establishment file. There are 213 such candidates in this sample. This directs the operator to verify the current business and address; it does not label them closed. The matched city record, if any, stays visible alongside the warning.

Two source traps are now captured in the UI and back-test:

- **Bangkok Bistro, 433 Washington St, 0.15 mi:** Overture labels the old restaurant `open`. The downloaded city file instead has a differently named BalaMao licensing record at the same street number. Current Chase sources identify 433 Washington as a Chase branch, and local reporting says the restaurant building was demolished for the branch. This is a stale/identity-conflict candidate, not a pitch lead. [Chase branch locator](https://locator.chase.com/ma/brighton), [WBZ report on the redevelopment](https://wbznewsradio.iheart.com/content/-brighton-makes-way-for-yet-another-bank-residents-arent-pleased/).
- **Little Pizza King, 389 Washington St:** Overture has no accepted website URL, but the business's own live site lists that same address, menu, phone and hours. The city food file also contains an exact active record. This is a direct false positive for `no URL in Overture = website opportunity`. [Little Pizza King contact page](https://lpkbrighton.com/contact/).

The live route showed the new exact-match count, 213 food-status checks and the active cross-source filters. It remains read-only and displayed the connected-data warning. No CRM records changed.

## 1,277-candidate quality back-test and first next prospect

The candidate count is a map-search pool, not 1,277 verified businesses. The official Boston downloads cover food establishments, Licensing Board permits and a certified-vendor subset. Their limited scope is visible in the cross-check: 78 exact matches, 404 same-street-number clues and 795 candidates with no match in those files. A legal-record match does not prove the storefront is open or has a marketing need.

The next review surfaced a recurring source-quality problem in home-service listings. Several nearby plumbing names and phone numbers appear on directory pages only, have almost no corroborating information, and use a suspiciously patterned set of 617-206-26xx phone numbers. Treat those listings as low-confidence research items, not independent businesses ready for a call. Search results also surfaced unrelated businesses with the same generic name, so a website result must match the exact Brighton identity before it can be used.

**Best next in-person discovery candidate: Nakhon Southern Thai, 296 Washington Street, 0.16 miles from Brighton Center.** This is a priority for a short verification conversation, not a confirmed “diamond” or qualified lead. Boston Magazine reported in February 2026 that the operator had converted the prior restaurant into a Southern Thai halal concept and pointed readers to `@nakhonboston`. The merchant menu/order pages show the same address, current menu and hours. The local government snapshot has two active records named “Nakhon” at the same street number; the review page now surfaces them as possible name variations, never exact identity matches. The map source associates a Toast ordering page, not an independent business website. The evidence supports current online activity and a differentiated story, but not a website defect or sales need. Verify in person that the operator and storefront are current, ask whether a standalone site or direct customer discovery is a priority, and confirm the exact Google listing before suggesting work.

**Nearby alternate: Cafe Mirror, 362 Washington Street, 0.05 miles from Brighton Center.** The downloaded city file has an exact active food-establishment record there. Brighton Main Streets identifies the cafe as family-operated, and its directory supplies the same address and phone. Current search results include delivery pages, directory listings and auto-generated menu pages that may display a “Website” link; that does not establish whether the cafe owns or controls an official site. Cafe Mirror remains worth a quick storefront check, but the exact Google listing, current decision maker, website ownership and actual service need are all unknown. Do not pitch an assumed defect or claim that it lacks a website.

Sources: [Boston active food-establishment data](https://data.boston.gov/dataset/active-food-establishment-licenses), [Boston Magazine on Nakhon’s February 2026 opening](https://www.bostonmagazine.com/restaurants/2026/02/02/hot-new-boston-restaurants-february-2026/), [Nakhon merchant menu on Toast](https://www.toasttab.com/local/order/nakhon), [Nakhon merchant ordering page](https://order.online/en-US/store/30505888), [Brighton Main Streets Cafe Mirror listing](https://brightonmainstreets.org/shops/cafe-mirror/), [Brighton Main Streets family story](https://brightonmainstreets.org/tony-malis-cafe-mirror/), [Cafe Mirror current directory page](https://restaurantguru.com/Cafe-Mirror-Boston). Directory and marketplace pages are discovery clues, not first-party identity evidence. No business was contacted, imported or changed in CRM.

## Live UI and roleplay boundary

The browser review confirmed the signed-in intake explicitly warns that normal prospect actions save to shared sales records, while the rehearsal room is browser-only. I did not click any real-record write action. The live queue exposed an ordering issue: an unchecked candidate could rank above a known-good website because the unknown state had a small research score. The updated queue title is “Next to research,” states that observed gaps come first, and displays a clear notice when the current campaign has no evidence-backed gap. After adding the separately verified read-only Overture browser checkpoint, the left tracker shows 21/42 (50%); the broader Overture qualification work remains active.

The first browser review of the new Overture page showed the wrong snapshot: 957 URLs, no mismatches and no distances, which did not match the corrected local file. The cause was sorting folder names instead of their recorded download times. After fixing snapshot selection, a live refresh showed 1,277 candidates, 655 accepted URLs, 311 suspect URLs and 311 without accepted URLs. It sorted the closest entries from Brighton Center, starting at 0.01 miles, and kept mismatched website links marked for review. The page is read-only and no shared CRM records were written.

The 50-case rehearsal notes remain the best current human back-test for the real businesses. The visible practice room is a product gap: it needs an isolated, realistic path to test the full operator workflow without touching shared sales records.

I also exercised one of the 12 fictional practice cases in the browser: a research-more decision and note survived a refresh, then the reset cleared the temporary test. This verifies local note-taking only. The practice room does not yet replay the 50 real-business rehearsal cases, connect discovery to website/Maps checks, or generate demos; those live end-to-end roleplay steps remain untested.

## What is still needed for a reliable lead engine

1. Add a disposable authenticated dataset or a genuine read-only preview that can run discovery, verification and website checks without writing to shared records.
2. For each nearby candidate, verify identity and operation, then check first-party site, exact Google Business Profile, and observable local SEO issues separately. A legal registration is an identity clue, not proof a location is open or wants marketing help.
3. Put likely local customer businesses ahead of agencies, institutions, suppliers and national chains, while retaining an explicit review-fit option for unfamiliar categories.
4. Use the new read-only Overture page to research candidates, then bring only individually verified discoveries into an isolated intake path.
5. Run the 50 recorded human dispositions through the revised queue and compare observed-gap leads, research cases, holds and skips. Keep an explanation for every ranking signal.
6. Rehearse one complete prospect-to-pitch journey in the isolated UI, including a wrong or stale website match, a third-party ordering page, a strong first-party site with a small SEO issue, and a clean site with a GBP gap.

## Research-first order and source-coverage back-test

The Overture review page now offers a second sort: **Research first**. It puts likely local customer types with a listed phone or email and no accepted website URL in this map source above weaker map evidence. It pushes likely chains, practitioner listings and shared-office clues lower. The order explains that a blank map field is only a research clue, not proof of a website gap or buying interest. The default nearest-first view remains available, and this page remains read-only.

The updated source counts distinguish **655 accepted website URLs**, **311 possible website mismatches**, and **622 rows without an accepted first-party website URL**. Of those 622, **311 have no URL accepted or held for mismatch review**. They still need individual research.

The public-source back-test found concrete false positives and identity clues:

- **Demma Aesthetics, 425 Market Street, Suite 101** appears in Overture with a Linktree clue and no accepted independent URL. Brighton Main Streets links to the business's current demma-medspa.com site, which has a locations page and online booking. This is a map-source miss, not a confirmed website opportunity. Exact Google listing ownership and a service need were not established. [Brighton Main Streets Demma listing](https://brightonmainstreets.org/shops/demma-aesthetics/), [Demma locations](https://demma-medspa.com/locations/), [Demma online booking](https://na02.patientnow.com/a/demmamedspa/OnlineBooking.aspx).
- **Performance and Recovery, 317 Washington Street** has no accepted site URL in Overture. A local practitioner directory describes a Brighton performance and recovery center operated by Kerry McGinn and links to kerrymcginn.com. The exact address and map-record identity are not confirmed, so this remains a possible match to investigate, not a confirmed lead. [Cambridge Naturals practitioner listing](https://www.cambridgenaturals.com/body-work).
- **Ensueno Body & Skin Care Clinic, 353 Washington Street** has no URL in Overture, while YellowPages associates the listing with a treatment page on cosmeticosensueno.com. That third-party listing does not establish the current clinic's website ownership or current operation. The candidate stays in research, not in a website-gap bucket. [YellowPages listing](https://www.yellowpages.com/brighton-ma/mip/ensueno-body-skin-care-clinic-10160067).
- **Academy Hill Plumbing, 19 Academy Hill Road** is near Brighton Center and has a phone in Overture, but current operation and website identity are unresolved. AllBiz says no website is listed; YellowPages labels its listing “Website” without exposing a matching first-party destination in the result. This is a high-priority human identity check, not a diamond or a pitch-ready prospect. [AllBiz listing](https://www.allbiz.com/business/academy-hill-plumbing_3X-617-206-2620), [YellowPages directory result](https://www.yellowpages.com/brighton-ma/ttp-plumbing).

These checks strengthen the case for a local-directory coverage layer alongside government files and Overture. Do not treat directory counts as unique businesses, and do not infer Google Business Profile status from a directory link or a GMBlisting tracking parameter. No business was imported, contacted, or changed in CRM.

## Stronger local-directory back-test

- **Ensueno Body and Skin Care Clinic, 353 Washington Street** is the best current verification candidate from this pass. Brighton Main Streets lists the clinic with the same address and phone, but its detail page exposes no business-owned website. YellowPages links its “Visit Website” button to cosmeticosensueno.com; opening that domain shows a cosmetics company identifying itself as based in Barcelona, Spain, with a different company address and phone. This is a concrete misdirected directory link and a possible first-party site gap. It is **not** yet a confirmed diamond lead: current storefront operation, exact Google Business Profile, whether the clinic controls the mismatched listing, decision maker and actual interest remain unknown. [Brighton Main Streets directory](https://brightonmainstreets.org/shops/ensueno-body-and-skin-care/), [YellowPages listing and destination](https://www.yellowpages.com/brighton-ma/mip/ensueno-body-skin-care-clinic-10160067), [destination site](https://www.cosmeticosensueno.com/).
- **Academy Hill Plumbing, 19 Academy Hill Road** should move down until independently resolved. AllBiz and HomeYou repeat the same phone and no-site claim, but AllBiz also lists multiple unrelated businesses at that exact address. Brighton Main Streets lists Harry’s Foreign & American Auto Service at 19 Academy Hill Road with a different phone. The plumber's operation, address relationship and contact number therefore remain unverified; directory repetition may reflect copied data rather than independent corroboration. [AllBiz listing](https://www.allbiz.com/business/academy-hill-plumbing_3X-617-206-2620), [Brighton Main Streets directory](https://brightonmainstreets.org/shops/).

This back-test identifies a product requirement: prioritize corroborated business identity and a direct, specific digital failure (such as a mismatched website destination) above a bare missing-URL flag. The next UI improvement should capture source URL, observation date, claim type and identity confidence separately, and keep possible issues in human review until the exact business and Google listing are confirmed.

## Verification evidence

**Latest local verification, 2026-10-15 10:43 UTC:**

- `npm test`: 270 TypeScript tests and 41 MJS tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: zero errors; 14 existing warnings remain in renderer/config files.
- `npx next build --webpack`: passed.
- Signed-in browser displayed 1,277 candidates, 655 accepted website URLs, 311 possible URL mismatches, 622 without an accepted first-party URL, the selected Research first order, and the revised roadmap at 24/45 checkpoints (53%). Of the 622, 311 have no accepted or suspect URL.
- No API credits or package additions were used in this triage pass. The page is read-only; no shared CRM or database records were changed.

The public-source checks exposed a real weakness in relying on one map source: Demma Aesthetics has a current first-party site linked by Brighton Main Streets despite the Overture omission; Performance and Recovery has a possible practitioner-site clue whose address match is unresolved; Ensueno has a third-party directory URL that does not prove website ownership; Academy Hill Plumbing has conflicting directory claims. These cases are useful back-test evidence for adding local directories and verifying each identity. None establishes a diamond lead.

Continue with first-party identity, current operation, exact Google listing, decision maker and a specific commercial problem for each candidate. A missing map URL or permit record does not establish need or buying interest. Do not import, contact, or mark candidates qualified from these clues alone.
