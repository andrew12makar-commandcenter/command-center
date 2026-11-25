# Government map presence review

## What it does

The Brighton government map remains the source index for the government records downloaded into this checkout. Each exact source location can be marked **Researching** or **Covered** after a human checks its public presence. Research notes are saved in `.local-discovery/government/review-status.json`, which is git-ignored and separate from the shared CRM.

Mark **Covered** only after recording:

- The exact Google Business Profile or Maps place URL and confirming its name, pin and storefront address.
- The working first-party website URL and why the site is strong for this business.
- A public URL supporting an observable SEO strength and a short note describing what was seen.

All three checks are required. A search page, directory result, missing source URL or government license by itself is not proof of coverage. The city source row stays on the map with an X; exact covered locations disappear from the default Overture prospect list and are skipped before future scan results are staged.

## Matching rule

Suppression requires the same normalized displayed business name, street number/name, suite/unit where present, and five-digit ZIP. ZIP+4 is reduced to its first five digits. Common street suffix spellings are normalized; if one source omits a suffix, the remaining street number/name still must match and two conflicting suffixes never match. Different names at one address, alternate legal names, missing ZIPs, and suite conflicts remain in the review queue. The original government rows are never deleted or merged.

## Evidence and limits

The review status is a human assertion with linked evidence, not an automatic SEO verdict. It lives only in this local checkout and does not synchronize to another computer. The downloaded Boston files cover active food permits, active Licensing Board permits and certified vendors in ZIP 02135; they are not a complete legal registry or a list of every active storefront. The map uses straight-line distance from Brighton Center.

The map and candidate list were checked in the authenticated local browser. Unit tests cover exact/ambiguous matching and evidence requirements. The full test suite, typecheck, lint and production build were run. The scan suppression path was not exercised against the signed-in shared CRM; no CRM scan or import was performed.
