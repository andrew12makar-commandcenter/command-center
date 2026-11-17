/*
 * Media plan: which real store photo or video fills each spot on the page.
 * Files come from scripts/prepare_media.py (site/media/media.generated.js).
 * A slot without a prepared file shows a labeled "photo pending" panel instead;
 * never substitute stock or generated imagery.
 *
 * Humidor scene labels describe the source honestly. After reviewing the
 * frames, refine `label` / `caption` and add `hotspots` ({x, y} in % of the
 * image, title, text) pointing at things that are really in the photo.
 */
window.CM_MEDIA_PLAN = {
  hero: {
    source: 'IMG_2013.jpg',
    alt: 'The Cigars & More storefront at night: a long red illuminated sign with cream lettering above lit glass windows, brick facade and a bench by the entrance.',
    position: '50% 40%', // object-position for the desktop crop
  },
  humidor: [
    { slot: 'humidor-1', source: 'IMG_2018.mov', label: 'Cabinet wall', caption: 'Still from the cigar cabinet walk-through video.', alt: 'Cigar cabinets with glass doors and wooden shelving inside Cigars & More.', hotspots: [] },
    { slot: 'humidor-2', source: 'IMG_2018.mov', label: 'Along the cabinets', caption: 'Still from the cigar cabinet walk-through video.', alt: 'Another angle along the cigar cabinets inside Cigars & More.', hotspots: [] },
    { slot: 'humidor-3', source: 'IMG_2018.mov', label: 'Cabinet shelves', caption: 'Still from the cigar cabinet walk-through video.', alt: 'Cigar boxes arranged on cabinet shelves inside Cigars & More.', hotspots: [] },
    { slot: 'humidor-4', source: 'IMG_2018.mov', label: 'Through the glass', caption: 'Still from the cigar cabinet walk-through video.', alt: 'View through the glass of a cigar cabinet inside Cigars & More.', hotspots: [] },
    { slot: 'humidor-5', source: 'IMG_2019.jpg', label: 'Wood detail', caption: 'Photograph of cabinet and wooden display detail.', alt: 'Close view of the wooden cigar cabinet and display detail.', hotspots: [] },
    { slot: 'humidor-6', source: 'IMG_2020.jpg', label: 'Full cabinet', caption: 'Photograph of a cigar cabinet.', alt: 'A cigar cabinet inside Cigars & More.', hotspots: [] },
  ],
  gallery: [
    { slot: 'glass-1', source: 'IMG_2015.jpg', kind: 'image', title: 'Decorative glass', alt: 'Close-up of a decorative glass display case.', feature: true },
    { slot: 'glass-clip', source: 'IMG_2014.mov', kind: 'video', title: 'The glass cases', alt: 'Short video moving past the glass display cabinetry.' },
    { slot: 'glass-2', source: 'IMG_2016.jpg', kind: 'image', title: 'Display case', alt: 'A lit glass display case in the store.' },
    { slot: 'accessories', source: 'IMG_2017.jpg', kind: 'image', title: 'Accessories', alt: 'Smoking accessories and merchandise on the shelves.' },
    { slot: 'shelves-clip', source: 'IMG_2021.mov', kind: 'video', title: 'The shelves', alt: 'Short video of the interior shelving.', wide: true },
  ],
  story: [
    { slot: 'shelves-still', source: 'IMG_2021.mov', alt: 'Interior shelving at Cigars & More.' },
    { slot: 'glass-still', source: 'IMG_2014.mov', alt: 'Glass display cabinetry at Cigars & More.' },
  ],
};
