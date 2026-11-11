import {defaultAboutHeading,defaultServicesHeading,type BusinessCategory} from './tokens.ts';
import {domId,headingTag,resolveRenderOptions,type ResolvedRender} from './options.ts';
import type {RenderOptions} from './types.ts';
import {
 INTERNAL_DISCLAIMER,TO_CONFIRM,emailHref,escapeHtml,externalRel,phoneHref,priceLabel,
 safeHref,safeImageSrc,suppliedText,unknownOr,visibleImages,visibleMenu,visibleReviews
} from './policy.ts';
import type {
 AboutContent,ActionLink,BookingContent,FooterContent,GalleryImage,HeroContent,
 HoursLocationContent,MenuItem,Review
} from './types.ts';

function hid(resolved:ResolvedRender,part:string):string{
 return domId(resolved,part);
}

function actionLink(action:ActionLink|null|undefined,className:string):string{
 const label=suppliedText(action?.label,80);
 if(!label)return '';
 const href=safeHref(action?.href);
 if(!href)return `<p class="ds-placeholder">${TO_CONFIRM}</p>`;
 return `<a class="${className}" href="${escapeHtml(href)}"${externalRel(href)}>${escapeHtml(label)}</a>`;
}

function contactLine(kind:'phone'|'email',value:string|null|undefined):string{
 const supplied=suppliedText(value,160);
 if(!supplied)return `<span class="ds-placeholder">${TO_CONFIRM}</span>`;
 const href=kind==='phone'?phoneHref(supplied):emailHref(supplied);
 if(!href)return `<span class="ds-plain">${escapeHtml(supplied)}</span>`;
 return `<a href="${escapeHtml(href)}">${escapeHtml(supplied)}</a>`;
}

function factBlock(value:string|null|undefined,max=2000):string{
 const text=unknownOr(value,max);
 const unknown=text===TO_CONFIRM;
 return `<span class="${unknown?'ds-placeholder':'ds-plain'}">${escapeHtml(text)}</span>`;
}

export function renderHero(
 input:{businessName:string;hero?:HeroContent|null},
 options?:RenderOptions
):string{
 const resolved=resolveRenderOptions(options);
 const name=suppliedText(input.businessName,200)||TO_CONFIRM;
 const hero=input.hero??{};
 const headline=suppliedText(hero.headline,180)||name;
 const titleId=hid(resolved,'hero-title');
 const H=headingTag(resolved,1);
 const eyebrow=suppliedText(hero.eyebrow,120);
 const support=suppliedText(hero.support,500);
 const note=suppliedText(hero.note,500);
 const mediaAlt=suppliedText(hero.media?.alt,300);
 const mediaSrc=mediaAlt?safeImageSrc(hero.media?.src):null;
 const caption=suppliedText(hero.media?.caption,160);
 const primary=actionLink(hero.primaryAction,'ds-btn ds-btn-primary');
 const secondary=actionLink(hero.secondaryAction,'ds-btn ds-btn-secondary');
 return `<section class="ds-hero" id="${hid(resolved,'top')}" data-section="hero" aria-labelledby="${titleId}">
 <div class="ds-wrap ds-hero-grid">
  <div class="ds-hero-copy">
   ${eyebrow?`<p class="ds-eyebrow">${escapeHtml(eyebrow)}</p>`:''}
   <${H} class="ds-display" id="${titleId}">${escapeHtml(headline)}</${H}>
   ${support?`<p class="ds-lede ds-plain">${escapeHtml(support)}</p>`:''}
   ${note?`<p class="ds-note ds-plain">${escapeHtml(note)}</p>`:''}
   ${primary||secondary?`<div class="ds-actions">${primary}${secondary}</div>`:''}
  </div>
  ${mediaSrc&&mediaAlt?`<figure class="ds-hero-media"><img src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(mediaAlt)}">${caption?`<figcaption>${escapeHtml(caption)}</figcaption>`:''}</figure>`:''}
 </div>
</section>`;
}

export function renderServices(
 input:{category:BusinessCategory;items?:MenuItem[]|null;heading?:string|null;note?:string|null},
 options?:RenderOptions
):string{
 const resolved=resolveRenderOptions(options);
 const titleId=hid(resolved,'services-title');
 const H=headingTag(resolved,2);
 const heading=suppliedText(input.heading,120)||defaultServicesHeading(input.category);
 const note=suppliedText(input.note,400);
 const items=visibleMenu(input.items);
 const namedCount=(Array.isArray(input.items)?input.items:[]).filter(item=>item&&suppliedText(item.name,180)).length;
 const omitted=namedCount>items.length;
 const body=items.length?`<ul class="ds-menu">${items.map((item,index)=>menuRow(item,index,resolved)).join('')}</ul>`
  :`<p class="ds-empty"><span class="ds-placeholder">${escapeHtml(defaultServicesHeading(input.category))} ${TO_CONFIRM}</span></p>`;
 return `<section class="ds-section" id="${hid(resolved,'services')}" data-section="services" aria-labelledby="${titleId}">
 <div class="ds-wrap">
  <header class="ds-section-head">
   <p class="ds-eyebrow">${escapeHtml(defaultServicesHeading(input.category))}</p>
   <${H} class="ds-title" id="${titleId}">${escapeHtml(heading)}</${H}>
   ${note?`<p class="ds-source ds-plain">${escapeHtml(note)}</p>`:''}
  </header>
  ${body}
  ${omitted?`<p class="ds-source">Additional items were not rendered (limit 24). ${TO_CONFIRM} the full list.</p>`:''}
 </div>
</section>`;
}

function menuRow(item:MenuItem,index:number,resolved:ResolvedRender):string{
 const H=headingTag(resolved,3);
 const price=priceLabel(item.price);
 const unconfirmed=price===TO_CONFIRM;
 const detail=suppliedText(item.detail,400);
 const duration=suppliedText(item.duration,40);
 return `<li class="ds-menu-row">
  <span class="ds-index" aria-hidden="true">${String(index+1).padStart(2,'0')}</span>
  <div>
   <${H} class="ds-sub">${escapeHtml(item.name)}</${H}>
   ${detail?`<p class="ds-muted ds-plain">${escapeHtml(detail)}</p>`:''}
  </div>
  <p class="ds-menu-meta">
   ${duration?`<span class="ds-duration">${escapeHtml(duration)}</span>`:''}
   <span class="ds-price${unconfirmed?' ds-unconfirmed':''}">${escapeHtml(price)}</span>
  </p>
 </li>`;
}

export function renderGallery(
 input:{images?:GalleryImage[]|null;heading?:string|null},
 options?:RenderOptions
):string{
 const resolved=resolveRenderOptions(options);
 const images=visibleImages(input.images);
 if(!images.length)return '';
 const titleId=hid(resolved,'gallery-title');
 const H=headingTag(resolved,2);
 const heading=suppliedText(input.heading,120)||'Gallery';
 const usableCount=(Array.isArray(input.images)?input.images:[]).filter(image=>image&&suppliedText(image.alt,300)&&safeImageSrc(image.src)).length;
 const omitted=usableCount>images.length;
 return `<section class="ds-section" id="${hid(resolved,'gallery')}" data-section="gallery" aria-labelledby="${titleId}">
 <div class="ds-wrap">
  <header class="ds-section-head">
   <p class="ds-eyebrow">Gallery</p>
   <${H} class="ds-title" id="${titleId}">${escapeHtml(heading)}</${H}>
  </header>
  <ul class="ds-gallery">${images.map(image=>`<li><figure>
   <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}">
   ${image.caption||image.credit?`<figcaption>${[image.caption,image.credit].filter((part):part is string=>Boolean(part)).map(part=>escapeHtml(part)).join(' · ')}</figcaption>`:''}
  </figure></li>`).join('')}</ul>
  ${omitted?`<p class="ds-source">Additional images were not rendered (limit 12).</p>`:''}
 </div>
</section>`;
}

export function renderAbout(
 input:{category:BusinessCategory;about?:AboutContent|null},
 options?:RenderOptions
):string{
 const resolved=resolveRenderOptions(options);
 const about=input.about??{};
 const titleId=hid(resolved,'about-title');
 const H=headingTag(resolved,2);
 const heading=suppliedText(about.heading,140)||defaultAboutHeading(input.category);
 const source=suppliedText(about.sourceNote,400);
 return `<section class="ds-section" id="${hid(resolved,'about')}" data-section="about" aria-labelledby="${titleId}">
 <div class="ds-wrap ds-about-grid">
  <header>
   <p class="ds-eyebrow">About</p>
   <${H} class="ds-title" id="${titleId}">${escapeHtml(heading)}</${H}>
  </header>
  <div>
   <p>${factBlock(about.body,2000)}</p>
   ${source?`<p class="ds-source ds-plain">${escapeHtml(source)}</p>`:''}
  </div>
 </div>
</section>`;
}

export function renderHoursLocation(
 input:{hoursLocation?:HoursLocationContent|null},
 options?:RenderOptions
):string{
 const resolved=resolveRenderOptions(options);
 const hours=input.hoursLocation??{};
 const titleId=hid(resolved,'hours-title');
 const H=headingTag(resolved,2);
 const Sub=headingTag(resolved,3);
 const heading=suppliedText(hours.heading,140)||'Hours and location';
 const map=safeHref(hours.mapUrl);
 const note=suppliedText(hours.note,400);
 return `<section class="ds-section" id="${hid(resolved,'hours')}" data-section="hours" aria-labelledby="${titleId}">
 <div class="ds-wrap">
  <header class="ds-section-head">
   <p class="ds-eyebrow">Visit</p>
   <${H} class="ds-title" id="${titleId}">${escapeHtml(heading)}</${H}>
  </header>
  <div class="ds-hours-grid">
   <article class="ds-card">
    <${Sub} class="ds-sub">Hours</${Sub}>
    <p>${factBlock(hours.hours,500)}</p>
   </article>
   <article class="ds-card">
    <${Sub} class="ds-sub">Location</${Sub}>
    <dl class="ds-defn">
     <div><dt>Address</dt><dd>${factBlock(hours.address,500)}</dd></div>
     <div><dt>Phone</dt><dd>${contactLine('phone',hours.phone)}</dd></div>
     <div><dt>Email</dt><dd>${contactLine('email',hours.email)}</dd></div>
    </dl>
    ${map?`<p><a href="${escapeHtml(map)}"${externalRel(map)}>Map</a></p>`:''}
    ${note?`<p class="ds-source ds-plain">${escapeHtml(note)}</p>`:''}
   </article>
  </div>
 </div>
</section>`;
}

export function renderReviews(
 input:{reviews?:Review[]|null},
 options?:RenderOptions
):string{
 const resolved=resolveRenderOptions(options);
 const reviews=visibleReviews(input.reviews);
 if(!reviews.length)return '';
 const titleId=hid(resolved,'reviews-title');
 const H=headingTag(resolved,2);
 const usableCount=(Array.isArray(input.reviews)?input.reviews:[]).filter(review=>review&&suppliedText(review.quote)&&suppliedText(review.author,160)&&suppliedText(review.source,180)).length;
 const omitted=usableCount>reviews.length;
 return `<section class="ds-section" id="${hid(resolved,'reviews')}" data-section="reviews" aria-labelledby="${titleId}">
 <div class="ds-wrap">
  <header class="ds-section-head">
   <p class="ds-eyebrow">Reviews</p>
   <${H} class="ds-title" id="${titleId}">Attributed reviews</${H}>
  </header>
  ${reviews.map(review=>`<figure class="ds-review">
   <blockquote><p class="ds-plain">${escapeHtml(review.quote)}</p></blockquote>
   <figcaption>${escapeHtml(review.author)}, <cite>${escapeHtml(review.source)}</cite></figcaption>
  </figure>`).join('')}
  ${omitted?`<p class="ds-source">Additional reviews were not rendered (limit 12).</p>`:''}
 </div>
</section>`;
}

export function renderBooking(
 input:{booking?:BookingContent|null},
 options?:RenderOptions
):string{
 const resolved=resolveRenderOptions(options);
 const booking=input.booking??{};
 const titleId=hid(resolved,'booking-title');
 const H=headingTag(resolved,2);
 const heading=suppliedText(booking.heading,140)||'Book or ask';
 const body=suppliedText(booking.body,800);
 const policies=(booking.policies??[]).map(item=>suppliedText(item,200)).filter((item):item is string=>Boolean(item)).slice(0,8);
 const action=actionLink(booking.action,'ds-btn ds-btn-primary ds-btn-large');
 const phoneText=suppliedText(booking.phone,160);
 const phoneHrefValue=phoneText?phoneHref(phoneText):null;
 return `<section class="ds-section ds-booking" id="${hid(resolved,'booking')}" data-section="booking" aria-labelledby="${titleId}">
 <div class="ds-wrap ds-booking-grid">
  <div>
   <p class="ds-eyebrow">Next step</p>
   <${H} class="ds-title" id="${titleId}">${escapeHtml(heading)}</${H}>
   ${body?`<p class="ds-lede ds-plain">${escapeHtml(body)}</p>`:`<p class="ds-placeholder">${TO_CONFIRM}</p>`}
   ${policies.length?`<ul class="ds-policy">${policies.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>`:''}
  </div>
  <div class="ds-booking-card">
   ${action||`<p class="ds-placeholder">Booking link ${TO_CONFIRM}</p>`}
   ${phoneText&&phoneHrefValue?`<p><a href="${escapeHtml(phoneHrefValue)}">${escapeHtml(phoneText)}</a></p>`:''}
  </div>
 </div>
</section>`;
}

export function renderFooter(
 input:{businessName:string;footer?:FooterContent|null},
 options?:RenderOptions
):string{
 const resolved=resolveRenderOptions(options);
 const name=suppliedText(input.businessName,200)||TO_CONFIRM;
 const note=suppliedText(input.footer?.note,800);
 const sources=(input.footer?.sources??[]).flatMap(source=>{
  const label=suppliedText(source?.label,180);
  const href=safeHref(source?.href);
  if(!label||!href)return [];
  return [`<li><a href="${escapeHtml(href)}"${externalRel(href)}>${escapeHtml(label)}</a></li>`];
 }).slice(0,8);
 const H=headingTag(resolved,2);
 return `<footer class="ds-footer" id="${hid(resolved,'footer')}" data-section="footer">
 <div class="ds-wrap">
  <p class="ds-footer-disclaimer">${INTERNAL_DISCLAIMER}</p>
  <p class="ds-wordmark">${escapeHtml(name)}</p>
  ${note?`<p class="ds-plain">${escapeHtml(note)}</p>`:''}
  ${sources.length?`<${H} class="ds-title">Sources</${H}><ul>${sources.join('')}</ul>`:''}
 </div>
</footer>`;
}

export function renderDisclaimerBanner():string{
 return `<div class="ds-banner" role="note">${INTERNAL_DISCLAIMER}</div>`;
}
