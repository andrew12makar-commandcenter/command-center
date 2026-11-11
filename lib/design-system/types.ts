// Public content contracts for the small-business design system.
// Callers pass only facts they already have. Missing facts stay "to confirm".

import type {BusinessCategory} from './tokens.ts';

export type ActionLink={label:string;href:string};

export type HeroContent={
 eyebrow?:string|null;
 headline?:string|null;
 support?:string|null;
 note?:string|null;
 primaryAction?:ActionLink|null;
 secondaryAction?:ActionLink|null;
 media?:{src:string;alt:string;caption?:string|null}|null;
};

export type MenuItem={
 name:string;
 detail?:string|null;
 duration?:string|null;
 price?:string|null;
};

export type GalleryImage={
 src:string;
 alt:string;
 caption?:string|null;
 credit?:string|null;
};

export type AboutContent={
 heading?:string|null;
 body?:string|null;
 sourceNote?:string|null;
};

export type HoursLocationContent={
 heading?:string|null;
 hours?:string|null;
 address?:string|null;
 phone?:string|null;
 email?:string|null;
 mapUrl?:string|null;
 note?:string|null;
};

/** A review is rendered only when quote, author, and source are all non-empty. */
export type Review={quote:string;author:string;source:string};

export type BookingContent={
 heading?:string|null;
 body?:string|null;
 policies?:string[]|null;
 action?:ActionLink|null;
 phone?:string|null;
};

export type FooterContent={
 note?:string|null;
 sources?:Array<{label:string;href:string}>|null;
};

/**
 * Always an internal concept. There is no owner-approval switch in this
 * library: the footer disclaimer and noindex meta cannot be turned off.
 */
export type DesignSite={
 category:BusinessCategory;
 businessName:string;
 hero?:HeroContent|null;
 services?:MenuItem[]|null;
 servicesHeading?:string|null;
 servicesNote?:string|null;
 gallery?:GalleryImage[]|null;
 galleryHeading?:string|null;
 about?:AboutContent|null;
 hoursLocation?:HoursLocationContent|null;
 reviews?:Review[]|null;
 booking?:BookingContent|null;
 footer?:FooterContent|null;
};

export type RenderOptions={
 /** Stable prefix for element ids when several sites share a page. */
 idPrefix?:string;
 /** 1 = hero is h1 (standalone page). 2 = hero is h2 under a catalog h1. */
 headingBase?:1|2;
 /** True when the site is nested inside another page's landmarks. */
 embed?:boolean;
 /** Relative URL prefix for self-hosted font files. Remote URLs are rejected. */
 fontBase?:string;
};

export type SectionName='hero'|'services'|'gallery'|'about'|'hours'|'reviews'|'booking'|'footer';
