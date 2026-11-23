// Client site registry for the Command Center Client Builds and Client Demos area.
// Each client site lives in its own repository and hosting account. The Command
// Center only links to, embeds and reads public metadata about it.
// To add the next client site, append one entry to CLIENT_SITES and set
// collection to 'build' (sold or live on a domain) or 'demo' (preview only).
// alsoIn lists a site in a second section too (Circle Tavern is a sold Client
// Build that is also shown in Client Demos as a finished example to pitch with).

export type ClientSiteCollection = 'build' | 'demo';

export type ClientSiteBranch = {
  name: string;
  owner: string;
  /** Branch preview URL, if the host builds one. */
  previewUrl?: string;
  note?: string;
  /** Recorded commit when live activity cannot be read from GitHub. */
  commitSha?: string;
  commitMessage?: string;
  commitDate?: string;
  commitUrl?: string;
};

export type ClientSiteRepo = {
  host?: 'github' | 'gitlab';
  owner: string;
  name: string;
  defaultBranch: string;
};

export type ClientSite = {
  slug: string;
  name: string;
  client: string;
  summary: string;
  /** Sold/live work vs preview-only demos. */
  collection: ClientSiteCollection;
  /** Extra sections the card also appears in, e.g. a sold live site shown in Client Demos as a pitch example. */
  alsoIn?: ClientSiteCollection[];
  /** Lifecycle label shown on the card. */
  stage: 'In build' | 'In review' | 'Live' | 'Paused';
  liveUrl: string;
  /** Immutable host URL for the same release, if one exists. */
  pinnedUrl?: string;
  hosting: string;
  saleNote?: string;
  repo: ClientSiteRepo;
  branches: ClientSiteBranch[];
  /** Repo path of a markdown status file with tables (Area | State | Evidence). */
  statusDoc?: string;
  /** Optional card thumbnail: a real screenshot of the site, served from public/. */
  thumbnail?: { src: string; alt: string; width: number; height: number };
};

export const COLLECTION_LABELS: Record<ClientSiteCollection, string> = {
  build: 'Client Builds',
  demo: 'Client Demos',
};

export const CLIENT_SITES: ClientSite[] = [
  {
    slug: 'circle-tavern',
    name: 'Circle Tavern',
    client: 'George · Circle Tavern',
    collection: 'build',
    alsoIn: ['demo'],
    summary: 'Sold live venue site on www.thecircletavern.com. The Nov 14, 2026 production release replaces the Campus2Care event banner with a call-to-book banner at (617) 904-8482 and removes the food menu so only drinks remain.',
    stage: 'Live',
    liveUrl: 'https://www.thecircletavern.com/',
    pinnedUrl: 'https://2f6b8925.circle-tavern-official.pages.dev',
    hosting: 'Cloudflare Pages project circle-tavern-official (Andrew personal account)',
    saleNote: 'Sold to George for $1,000.',
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'circle-venu',
      defaultBranch: 'release/live-20261114',
    },
    branches: [
      {
        name: 'release/live-20261114',
        owner: 'Andrew',
        previewUrl: 'https://2f6b8925.circle-tavern-official.pages.dev',
        note: 'Canonical production deploy 8be1a3b0-28a8-491c-8ee5-9e8b1bce1f80, Saturday Nov 14, 2026, 5:08 PM ET. Source: circle-venu branch release/live-20261114 @ 9ec7cd87 (live-site/ folder). Changes: event-booking call banner (617) 904-8482 replaced the Campus2Care banner; food menu removed (drinks only). Previous production e47cf2ba is the rollback target. Cloudflare also serves this release at https://8be1a3b0.circle-tavern-official.pages.dev.',
        commitSha: '9ec7cd8795cc9bef5ab72054249979314679a380',
        commitMessage: 'live-site: drinks-only menu open, comment cleanup, deploy worker builder + release README',
        commitDate: '2026-11-14T22:07:56Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/circle-venu/-/commit/9ec7cd8795cc9bef5ab72054249979314679a380',
      },
    ],
  },
  {
    slug: 'johnnyds',
    name: "Johnny D's Fresh Fruit & Produce",
    client: "Johnny D's Fruit & Produce",
    collection: 'demo',
    summary: 'Preview-only fruit market site, revision r8: lower hero crop so the full storefront sign shows, with reduced motion zoom. Not on a custom domain.',
    stage: 'In review',
    liveUrl: 'https://r8.johnnyds-preview.pages.dev',
    pinnedUrl: 'https://f0ba5452.johnnyds-preview.pages.dev',
    hosting: 'Cloudflare Pages project johnnyds-preview (Andrew personal account)',
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'johnnyds-site',
      defaultBranch: 'r8',
    },
    branches: [
      {
        name: 'r8',
        owner: 'Andrew',
        previewUrl: 'https://r8.johnnyds-preview.pages.dev',
        note: 'Preview only; not on a domain. Pinned URL: https://f0ba5452.johnnyds-preview.pages.dev',
        commitSha: 'adc086f8887a9bf21ac1be0ed7db9cf2ed9da480',
        commitMessage: 'r8 (2/2): native-resolution hero crops from photo A (765×1020)',
        commitDate: '2026-11-14T20:03:26Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/johnnyds-site/-/commit/adc086f8887a9bf21ac1be0ed7db9cf2ed9da480',
      },
    ],
  },
  {
    slug: 'universal-barber',
    name: 'Universal Barber Shop',
    client: 'Rafy · Universal Barber Shop, 4 Chestnut Hill Ave, Brighton',
    collection: 'demo',
    summary: 'Pitch demo, preview only (r4): the Charcoal & Brass r3 site plus its own booking and online payment page. Customers pick a cut ($35 haircut or fade, $25 kids 15 and under, five other cuts in an "Other services" dropdown; prices set from the shop price list on Nov 16), a day and a 30-minute time from the shop hours (Sunday closed, Thu/Fri until 7 PM), enter name and phone, then pay. Payments run in demo mode ("Demo payment · Stripe connects at launch", no money moves) until the owner connects his own Stripe account and bank (docs/BOOKING-PAYMENTS.md). Double-booking protected; owner view at /admin behind an owner code. Call stays the main action. r3 is the same site without payments (fallback). Nov 16: real price list on the site, "Cash & card" instead of "Cash only", storefront hero photo. Owner still to confirm: phone (817) 966-9525 vs (617) 787-0200; Thu/Fri close 7 PM vs 6 PM; rating; whether combo services need more than 30 minutes. Not on a custom domain.',
    stage: 'In review',
    liveUrl: 'https://r4.universal-barber-preview.pages.dev',
    pinnedUrl: 'https://80efd175.universal-barber-preview.pages.dev',
    hosting: 'Cloudflare Pages project universal-barber-preview (Andrew personal account), noindex; bookings in D1 universal-barber-bookings-preview',
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'universal-barber-site',
      defaultBranch: 'r4',
    },
    branches: [
      {
        name: 'r4',
        owner: 'Andrew',
        previewUrl: 'https://r4.universal-barber-preview.pages.dev',
        note: 'Pitch version with booking + online payment, preview only; not on a domain. Pinned URL: https://80efd175.universal-barber-preview.pages.dev (built from 393c1f35). Book at /book/, owner view at /admin/. Payments: demo mode until STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set (docs/BOOKING-PAYMENTS.md). Nov 16: real prices ($35/$25 and the full list), cash and card, other cuts in a booking dropdown, storefront hero photo; checked live by hand. QA suites last passed on 302b15f1 (site 103/103, contrast pass, booking 50/50) and were updated for the new prices but not re-run.',
        commitSha: '393c1f3571c4419e359dfd6fbba7368be901adb2',
        commitMessage: 'r4: version tag on hero image URLs so cached copies of the old hero are not shown',
        commitDate: '2026-11-16T21:40:27Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/universal-barber-site/-/commit/393c1f3571c4419e359dfd6fbba7368be901adb2',
      },
      {
        name: 'r3',
        owner: 'Andrew',
        previewUrl: 'https://r3.universal-barber-preview.pages.dev',
        note: 'No-payment fallback (r4 adds booking + payments on top). Preview only; not on a domain. Palette: Charcoal & Brass (cream #F5F0E8, charcoal #26221F, brass #C29A5B). Pinned URL: https://e4dc0b41.universal-barber-preview.pages.dev. QA 103/103 + contrast 6/6. Same open owner items as r2.',
        commitSha: '53e746a1ef9989c914dec3b59739a4242757981f',
        commitMessage: 'r3-a: palette study notes and theme generator',
        commitDate: '2026-11-15T17:25:02Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/universal-barber-site/-/commit/53e746a1ef9989c914dec3b59739a4242757981f',
      },
      {
        name: 'r2',
        owner: 'Andrew',
        previewUrl: 'https://r2.universal-barber-preview.pages.dev',
        note: 'Pitch demo, preview only; not on a domain. Pinned URL: https://be605b54.universal-barber-preview.pages.dev (built from f2848d68). QA 103/103 + contrast 6/6. Open owner items: phone (817) 966-9525 vs (617) 787-0200; Thu/Fri 7 PM close; prices $30/$20 vs $35/$25; booking site; rating; kids age.',
        commitSha: '3774ca5087fbe0dbb164727ae809eadf88a70128',
        commitMessage: 'r2: add deploy/make_pages_worker.py (how r2 was deployed)',
        commitDate: '2026-11-14T23:08:40Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/universal-barber-site/-/commit/3774ca5087fbe0dbb164727ae809eadf88a70128',
      },
      {
        name: 'r1',
        owner: 'President Claude',
        note: 'First build (Claude Opus 5.5), QA 95/95; never deployed. r2 branches from it.',
        commitSha: '9a1469ae66b2261f4e7f0ec98f954d88178cd5b5',
        commitMessage: 'r1: QA results and screenshots for the in-between width fix (95 passed, 0 failed)',
        commitDate: '2026-11-14T22:05:27Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/universal-barber-site/-/commit/9a1469ae66b2261f4e7f0ec98f954d88178cd5b5',
      },
    ],
  },
  {
    slug: 'zisis-convenience',
    name: 'Zisis Convenience Store',
    client: 'Zisis Convenience Store · neighborhood convenience store, 375 Washington Street, Brighton, Massachusetts',
    collection: 'demo',
    summary: 'Interactive neighborhood convenience-store website concept featuring live hours, searchable everyday essentials, original storefront photography, and responsive design. Client Demo 04, preview only (r1). Confirmed by Andrew: phone 617-785-2938, open daily 8 AM–8 PM (live Boston-time status), cash and card. Ivory hero with an illustrative storefront image supplied by Andrew and approved by the owner (captioned as illustrative; real photos stay in the gallery); Uber Eats-style catalog of 50 branded products, 10 per category, every one with its own package photo with sample prices, category chips, search, cart with quantities and a checkout preview in demo mode ("Live checkout available after merchant activation"; nothing is ordered or charged). Owner still to confirm: real stock and prices, image rights before any launch, holiday hours, ATM, parking/accessibility, card minimums/EBT, and whether to activate Uber Eats ordering. Not on a custom domain.',
    stage: 'In review',
    liveUrl: 'https://r1.zisis-convenience-preview.pages.dev',
    pinnedUrl: 'https://f6eb2f37.zisis-convenience-preview.pages.dev',
    hosting: 'Cloudflare Pages project zisis-convenience-preview (Andrew personal account), preview branch r1, noindex',
    thumbnail: { src: '/client-sites/zisis-convenience.jpg', alt: 'Zisis Convenience preview: ivory hero with the illustrative storefront image and Get Directions button', width: 1200, height: 750 },
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'zisis-convenience-site',
      defaultBranch: 'r1',
    },
    branches: [
      {
        name: 'r1',
        owner: 'Andrew',
        previewUrl: 'https://r1.zisis-convenience-preview.pages.dev',
        note: 'Preview only; not on a domain. Pinned URL: https://f6eb2f37.zisis-convenience-preview.pages.dev (built from 298885e6). Built by Codex, finished by President Claude Nov 16. QA on the live preview: 271/271 at 390, 768, 1024 and 1440 wide (catalog, cart math and persistence, checkout preview, focus traps), zero axe violations; Lighthouse 13.6.0 mobile 99/100/100 (SEO 58 by design: noindex). Product photos are retailer reference images (rights not cleared) and prices are sample prices.',
        commitSha: '298885e6410c062af77c0b1b9c5f42ff217a8ca4',
        commitMessage: "Catalog photos 50/50: Smucker's Seedless Strawberry Jam + Campbell's Tomato from Andrew's sources; hero rebuilt from lossless PNG (owner-approved)",
        commitDate: '2026-11-17T09:47:42Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/zisis-convenience-site/-/commit/298885e6410c062af77c0b1b9c5f42ff217a8ca4',
      },
    ],
  },
  {
    slug: 'oliveira-deli',
    name: 'Oliveira Deli Market',
    client: 'Oliveira Deli Market, 243 Faneuil St, Brighton (owner not yet named)',
    collection: 'demo',
    summary: 'Client Demo 05, pitch demo, preview only (r1 @ a9a43b07). Brazilian deli and market site: hero is the original r1 layout (large food photo plus a tilted inset of an AI storefront concept). Each photo appears once — food in the hero, buffet on the counter board, pastel in the gallery, and the real 243 Faneuil Street storefront (Harvard Crimson, Dec 2024) in Visit. Menu item images are AI illustrations (disclosed in the footer). Storefront and counter photos are third-party, provisional and demo-only (docs/ASSET-SOURCES.md). Real published menu data: 26 DoorDash items and prices (delivery-listing prices, may differ in-store). Listed Restaurantji hours with a Boston-time OPEN/CLOSED status, menu filter and search, Favorites as a category-panel filter, an Order on DoorDash link to the official store, and a labelled proof-of-concept groceries link to ubereats.com (nothing is submitted on this site). Keyboard lightbox, reduced-motion support, works without JavaScript, noindex. QA 79/79. Owner to confirm: hours, in-store prices, best sellers and specials, catering, phone orders, photo permission, owner story, and whether to connect a real Uber Eats store. Not on a custom domain.',
    stage: 'In review',
    liveUrl: 'https://r1.oliveira-deli-preview.pages.dev',
    hosting: 'Cloudflare Pages project oliveira-deli-preview (Andrew personal account), preview branch r1 only (no production deployment), noindex. Not behind Cloudflare Access yet: the link is unlisted but open.',
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'oliveira-deli-site',
      defaultBranch: 'r1',
    },
    branches: [
      {
        name: 'r1',
        owner: 'President Claude',
        previewUrl: 'https://r1.oliveira-deli-preview.pages.dev',
        note: 'Current r1 alias is serving a9a43b07 (confirmed on the live preview Nov 18, 2026). Head commit: r1-hero-243 (hero with AI facade inset, one copy of each photo, Favorites as a filter, Order on DoorDash plus a labelled Uber Eats groceries proof-of-concept link, QA 79/79). First-build pin https://7ad9a4d7.oliveira-deli-preview.pages.dev was built from 463346f2 and is no longer the current release; no new immutable Pages pin was recorded. Not behind Access yet.',
        commitSha: 'a9a43b07334354c344a2e58b7d78f7cfc717516a',
        commitMessage: 'r1-hero-243: original hero with facade inset, one copy of each photo, order links',
        commitDate: '2026-11-17T18:44:18Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/oliveira-deli-site/-/commit/a9a43b07334354c344a2e58b7d78f7cfc717516a',
      },
    ],
  },
  {
    slug: 'brighton-cellar-gourmet',
    name: 'Brighton Cellar & Gourmet',
    client: 'Brighton Cellar & Gourmet · specialty retail / beverage store, 569 Washington Street, Brighton, MA 02135 (owner not contacted)',
    collection: 'demo',
    summary: 'Client Demo 06 (the brief asked for 05, which Oliveira already holds), pitch demo, preview only (r1, Nov 17). "The Cellar Experience": premium boutique-retail site on the 8B restaurant template, Cormorant Garamond + Inter on warm ivory, burgundy and olive. Hero, six collection tiles, a filterable and searchable catalog (10 everyday products seen on the merchant listings, photographed from Open Food Facts, plus wine, beer & cider and spirits collection cards; no prices or stock), editorial "A Good Find, Close to Home", atmosphere gallery and a click-to-load Pannellum 360° concept (Poly Haven Warm Bar cubemap from the full 8192 px source, labelled illustrative), scroll transitions that reverse when scrolling back up, Uber Eats and DoorDash ordering at merchant level from one config (platform chooser dialog; nothing is ordered on the site), saved list kept in the browser (not a cart), listed store hours with a Boston-time open status, call and directions. All photography is illustrative (Unsplash, Open Food Facts CC BY-SA, Poly Haven CC0); no real store photos yet. Owner to confirm: hours, wordmark, photo shoot or 360° capture, catalog, copy. Not on a custom domain.',
    stage: 'In review',
    liveUrl: 'https://r1.brighton-cellar-gourmet-preview.pages.dev',
    pinnedUrl: 'https://e2752fc5.brighton-cellar-gourmet-preview.pages.dev',
    hosting: 'Cloudflare Pages project brighton-cellar-gourmet-preview (Andrew personal account), preview branch r1 only (no production deployment), noindex. Not behind Cloudflare Access: the link is unlisted but open.',
    thumbnail: { src: '/client-sites/brighton-cellar-gourmet.jpg', alt: 'Brighton Cellar & Gourmet preview: wine-shelf hero with the name, Explore the Collection and Order Online buttons', width: 1200, height: 750 },
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'brighton-cellar-gourmet',
      defaultBranch: 'r1',
    },
    branches: [
      {
        name: 'r1',
        owner: 'President Claude',
        previewUrl: 'https://r1.brighton-cellar-gourmet-preview.pages.dev',
        note: 'Built by President Claude (Claude Opus 5.5), Nov 17, 2026. Revision 3: hero transitions scroll-linked and mirrored (lines leave staggered on the way down and return in reverse on the way up, matching the load entrance) and the hero photo zoom fixed; revision 2 added reversible scroll transitions everywhere and a high-resolution 360° cubemap (2048 px faces desktop, 1280 px phones). Deployed as Cloudflare Pages preview e2752fc5 (built from 13ce29dd); pinned URL https://e2752fc5.brighton-cellar-gourmet-preview.pages.dev (earlier builds: e1ee565f from 018903f5, e47965ce from 6f3fd3f0). Verified Desktop checkpoint before each push. QA 118/118 on the live preview at 375, 390, 768 and 1440 wide (catalog filters and search, detail and ordering dialogs, saved list, 360° load/drag/Escape, hero and section transitions mirrored on scroll-up, hours boundaries incl. DST, reduced motion, no-JS, no external requests), zero axe violations. Lighthouse and physical-device tests not run.',
        commitSha: '13ce29dd811fa3c796bfdb12cde7c6fc45b1c81a',
        commitMessage: 'r1: hero transitions scroll-linked and mirrored; photo zoom fixed',
        commitDate: '2026-11-17T10:16:34Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/brighton-cellar-gourmet/-/commit/13ce29dd811fa3c796bfdb12cde7c6fc45b1c81a',
      },
    ],
  },
  {
    slug: 'kikis-kwikmart',
    name: 'Kiki’s Kwik-Mart',
    client: 'Kiki’s Kwik-Mart · neighborhood market, Irish & UK imports and deli, 236 Faneuil Street, Brighton, MA 02135 (owner not contacted)',
    collection: 'demo',
    summary: 'Client Demo 07 (the brief asked for 06, which Brighton Cellar already holds), pitch demo, preview only (r1, Nov 17). "A Little Piece of Ireland. Right Here in Brighton.": grocery-app browsing with an Irish neighborhood-market identity (red, cream, burgundy, restrained Irish green; Cormorant Garamond + Inter). Hero with an illustrative storefront rendering that matches the real single-storey building (captioned as a rendering, not a photo), six department cards, a 34-item catalog from the supplied seed (search, chips, detail dialog, basket with quantities and illustrative integer-cent subtotal saved in the browser, mobile basket bar, checkout preview marked "Live checkout not connected"), Kiki’s Deli menu board, Irish & UK imports rail with seasonal caveat, click-to-load 3D mini-market (CC0 pixel-art model, labelled illustrative) whose department buttons filter the catalog, Uber Eats and DoorDash chooser opening Kiki’s own merchant listings (nothing transfers), market (daily 6 AM–10 PM) and deli (Mon–Sat 6 AM–2 PM) open-now in Boston time. Facts from the brief: phone (617) 783-5146, since 1984. Drink photos are manufacturer packshots reused from the earlier convenience-store demo; owner interior photos and shelf crops were not received, so those items show designed photo-free rows. Owner to confirm: prices, stock, photos, hours. Not on a custom domain.',
    stage: 'In review',
    liveUrl: 'https://r1.kikis-kwikmart-preview.pages.dev',
    pinnedUrl: 'https://58cb9288.kikis-kwikmart-preview.pages.dev',
    hosting: 'Cloudflare Pages project kikis-kwikmart-preview (Andrew personal account), preview branch r1 only (no production deployment), noindex. Not behind Cloudflare Access: the link is unlisted but open.',
    thumbnail: { src: '/client-sites/kikis-kwikmart.jpg', alt: 'Kiki’s Kwik-Mart preview: burgundy hero with the headline, Explore the Market and Order From the Deli buttons, and the illustrative storefront rendering', width: 1200, height: 750 },
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'kikis-kwikmart-demo',
      defaultBranch: 'r1',
    },
    branches: [
      {
        name: 'r1',
        owner: 'President Claude',
        previewUrl: 'https://r1.kikis-kwikmart-preview.pages.dev',
        note: 'First build (Claude Opus 5.5), Nov 17, 2026. Pushed to GitLab (private) after a verified Desktop checkpoint (20261117T185521Z-477ddba771) and deployed as Cloudflare Pages preview 58cb9288 built from 477ddba7; pinned URL https://58cb9288.kikis-kwikmart-preview.pages.dev. QA 181/181 on the live preview at 390, 768, 1024 and 1440 wide (34 unique items, filters and search, detail dialog, basket add/quantity/remove/clear, integer-cent subtotal, reload persistence, checkout preview, merchant links, store/deli hours incl. Sunday, mobile menu, 3D load/drag/close, no external requests), no serious or critical axe findings. Lighthouse and physical-device tests not run.',
        commitSha: '477ddba771878350197c28d6c4938e7b1f5e88b2',
        commitMessage: 'r1: Kiki\'s Kwik-Mart client demo 07 — catalog, deli ordering, imports, 3D mini-market, QA',
        commitDate: '2026-11-17T18:55:17Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/kikis-kwikmart-demo/-/commit/477ddba771878350197c28d6c4938e7b1f5e88b2',
      },
    ],
  },
  {
    slug: 'cigars-and-more',
    name: 'Cigars & More',
    client: 'Cigars & More (owner and business facts not yet verified)',
    collection: 'demo',
    summary: 'Client Demo 08, Digital Humidor demo, preview only (r1). A static, dependency-free demonstration site for Cigars & More: hero, The Store, a Digital Humidor with six interior views, an interior gallery, and a Visit section. Not deployed; owner approval is required before any preview host is set up, so this card has no Pages URL yet. Real store photos and videos (IMG_2013.jpg to IMG_2021.mov) are not in the repo yet — every photo spot shows a labeled Photo pending panel. Address, hours and phone are null in site/business.js until the verified brief arrives (shown as Pending verification). QA 98/98 with pending media. Source repo is the private GitLab project cigars-and-more-site, branch r1 @ 6ff5134b. Originally built in GitHub command-center on branch claude/cigars-more-storefront-ggh2sl @ 388cc35. Not on a custom domain.',
    stage: 'In build',
    liveUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/cigars-and-more-site',
    hosting: 'Not deployed. Owner approval is required before any Cloudflare Pages (or other) preview. Source is the private GitLab project cigars-and-more-site, branch r1.',
    repo: {
      host: 'gitlab',
      owner: 'andrew-makar-personal-projects-group',
      name: 'cigars-and-more-site',
      defaultBranch: 'r1',
    },
    branches: [
      {
        name: 'r1',
        owner: 'Andrew',
        note: 'Demo only; not deployed. GitLab r1 head 6ff5134b0c7bd9da54b44d96cbdf03aa097e263c. Original build: GitHub andrew12makar-commandcenter/command-center branch claude/cigars-more-storefront-ggh2sl @ 388cc35. Photos pending (media-src/ is git-ignored). Business facts pending in site/business.js. QA 98/98 on the source at 388cc35 with pending media. Do not deploy without owner approval.',
        commitSha: '6ff5134b0c7bd9da54b44d96cbdf03aa097e263c',
        commitMessage: 'Remove temporary encoding test file',
        commitDate: '2026-11-18T21:10:15Z',
        commitUrl: 'https://gitlab.com/andrew-makar-personal-projects-group/cigars-and-more-site/-/commit/6ff5134b0c7bd9da54b44d96cbdf03aa097e263c',
      },
    ],
  },
];

export function getClientSite(slug: string): ClientSite | undefined {
  return CLIENT_SITES.find((site) => site.slug === slug);
}

/** Sites whose own collection matches, then sites listed there through alsoIn. */
export function sitesInCollection(collection: ClientSiteCollection): ClientSite[] {
  return [
    ...CLIENT_SITES.filter((site) => site.collection === collection),
    ...CLIENT_SITES.filter((site) => site.collection !== collection && (site.alsoIn ?? []).includes(collection)),
  ];
}

export function repoHost(site: ClientSite): 'github' | 'gitlab' {
  return site.repo.host ?? 'github';
}

export function repoUrl(site: ClientSite): string {
  const host = repoHost(site) === 'gitlab' ? 'https://gitlab.com' : 'https://github.com';
  return `${host}/${site.repo.owner}/${site.repo.name}`;
}

export function branchUrl(site: ClientSite, branch: string): string {
  const encoded = branch.split('/').map(encodeURIComponent).join('/');
  if (repoHost(site) === 'gitlab') {
    return `${repoUrl(site)}/-/tree/${encoded}`;
  }
  return `${repoUrl(site)}/tree/${encoded}`;
}

// ---------- STATUS.md parsing ----------

export type StatusRow = { cells: string[]; open: boolean };
export type StatusSection = { heading: string; columns: string[]; rows: StatusRow[] };

const OPEN_PATTERN = /\b(not done|placeholder|demo mode|inert|proposed|partial|blocked|waiting|needs confirmation|not tested|not opened|(?:isn't|not) verified|none exist)\b/i;

/** True when a status cell describes something that is not finished. */
export function isOpenState(state: string): boolean {
  return OPEN_PATTERN.test(state);
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

/** Strip the light markdown used in status tables so it renders as plain text. */
export function plainMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/** Parse every markdown table in a status document, grouped under its nearest heading. */
export function parseStatusMarkdown(markdown: string): { title: string; sections: StatusSection[] } {
  const lines = markdown.split(/\r?\n/);
  let title = '';
  let heading = '';
  const sections: StatusSection[] = [];
  let current: StatusSection | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      if (!title && h[1].length === 1) title = plainMarkdown(h[2]);
      else heading = plainMarkdown(h[2]);
      current = null;
      continue;
    }
    if (!line.trim().startsWith('|')) { current = null; continue; }
    const next = lines[i + 1] ?? '';
    if (!current && /^\s*\|?\s*:?-{3,}/.test(next)) {
      current = { heading: heading || title, columns: splitRow(line).map(plainMarkdown), rows: [] };
      sections.push(current);
      i++; // skip the separator row
      continue;
    }
    if (current) {
      const cells = splitRow(line).map(plainMarkdown);
      // Judge the state/result columns, not the item name (e.g. "shows the proposed layers").
      // A section heading like "(all PROPOSED, waiting for owner approval)" marks every row open.
      const open = isOpenState(cells.slice(1).join(' ')) || /needs confirmation/i.test(cells[0] ?? '') || isOpenState(current.heading);
      current.rows.push({ cells, open });
    }
  }
  return { title, sections };
}

/** Rows still open across all sections, with the section heading for context. */
export function openItems(sections: StatusSection[]): { heading: string; item: string; state: string }[] {
  return sections.flatMap((section) => section.rows.filter((row) => row.open).map((row) => ({
    heading: section.heading,
    item: row.cells[0] ?? '',
    state: row.cells.slice(1).filter(Boolean).join(' · '),
  })));
}
