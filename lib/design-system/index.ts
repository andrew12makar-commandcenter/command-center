// Public API for the generator lane. Import from this file.
// This package renders internal concepts only. It does not set owner approval
// and it cannot hide the internal disclaimer.

export {contrastRatio,relativeLuminance} from './contrast.ts';
export {renderDesignSystemCss,resolveFontBase} from './css.ts';
export {domId,resolveRenderOptions,sanitizeIdPrefix} from './options.ts';
export {
 INTERNAL_DISCLAIMER,TO_CONFIRM,emailHref,escapeHtml,phoneHref,priceLabel,
 safeHref,safeImageSrc,unknownOr,visibleImages,visibleMenu,visibleReviews
} from './policy.ts';
export {renderSite,renderSiteFragment} from './render.ts';
export {
 renderAbout,renderBooking,renderDisclaimerBanner,renderFooter,renderGallery,
 renderHero,renderHoursLocation,renderReviews,renderServices
} from './sections.ts';
export {
 BUSINESS_CATEGORIES,FONT_FILES,MIN_TEXT_CONTRAST,SECTION_ORDER,SPACE,THEMES,TYPE_SCALE,
 defaultAboutHeading,defaultServicesHeading,isBusinessCategory,themeContrastFailures,
 themeFor,themeTextPairs
} from './tokens.ts';
export type {BusinessCategory,DesignTheme,MotionTemperament,ThemeColors} from './tokens.ts';
export type {
 AboutContent,ActionLink,BookingContent,DesignSite,FooterContent,GalleryImage,
 HeroContent,HoursLocationContent,MenuItem,RenderOptions,Review,SectionName
} from './types.ts';

export const DESIGN_SYSTEM_VERSION=1 as const;
