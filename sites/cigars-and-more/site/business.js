/*
 * Cigars & More: the ONE source of business facts for this site.
 *
 * Only the storefront name is confirmed (it is on the sign in IMG_2013.jpg).
 * Everything else must come from the verified business brief. A null value is
 * shown on the page as "Pending verification" and turns off whatever depends
 * on it (call button, directions link, hours table). Do not guess values.
 */
window.CM_BUSINESS = {
  // Confirmed from the storefront photograph.
  signName: 'Cigars & More',
  descriptor: 'Cigar & smoke shop', // category visible in the store photos

  // ---- Pending verification (fill from the verified brief) ----
  officialName: null,      // e.g. legal / listing name if it differs from the sign
  address: null,           // { street: '', city: '', state: 'MA', zip: '' }
  phone: null,             // display format, e.g. '(617) 000-0000'
  hours: null,             // [{ days: 'Mon–Sat', time: '9 AM – 9 PM' }, ...]
  website: null,           // official website URL, if any
  social: [],              // [{ label: 'Instagram', url: 'https://...' }]
  parking: null,           // verified parking note
  accessibility: null,     // verified accessibility note
  story: null,             // owner-approved history paragraph; null keeps the section descriptive only

  // Legal minimum age to buy tobacco and nicotine products. 21 under federal
  // law and Massachusetts law; confirm local Boston requirements before launch.
  minimumAge: 21,
};
