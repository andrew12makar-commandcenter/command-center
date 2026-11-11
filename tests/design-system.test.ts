import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {contrastRatio} from '../lib/design-system/contrast.ts';
import {
 BUSINESS_CATEGORIES,FONT_FILES,INTERNAL_DISCLAIMER,TO_CONFIRM,priceLabel,renderAbout,
 renderBooking,renderDesignSystemCss,renderFooter,renderGallery,renderHero,renderHoursLocation,
 renderReviews,renderServices,renderSite,renderSiteFragment,themeContrastFailures,themeFor,
 visibleReviews
} from '../lib/design-system/index.ts';
import {buildPreviewHtml} from '../qa/design-system/build-preview.ts';

const svg=`data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#123456"/></svg>')}`;

test('black on white is the WCAG 21:1 reference ratio',()=>{
 assert.ok(Math.abs(contrastRatio('#000000','#ffffff')-21)<0.01);
});

test('every category theme keeps body text at 4.5:1',()=>{
 for(const category of BUSINESS_CATEGORIES){
  assert.deepEqual(themeContrastFailures(themeFor(category)),[]);
 }
});

test('stylesheet publishes tokens, local fonts, focus, 390px rules, and reduced motion',()=>{
 const css=renderDesignSystemCss();
 assert.match(css,/@media \(max-width:390px\)/);
 assert.match(css,/@media \(prefers-reduced-motion:\s*no-preference\)/);
 assert.match(css,/@media \(prefers-reduced-motion:\s*reduce\)/);
 assert.match(css,/animation:\s*none !important/);
 assert.match(css,/opacity:\s*1 !important/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/--ds-type-display:/);
 assert.match(css,/--ds-space-md:1\.5rem/);
 assert.doesNotMatch(css,/@import|fonts\.googleapis|url\(https?:/i);
 assert.doesNotMatch(css,/\.ds-hero-copy\{[^}]*opacity:\s*0/);
 for(const file of Object.values(FONT_FILES)){
  assert.match(css,new RegExp(file));
  readFileSync(new URL(`../lib/design-system/fonts/${file}`,import.meta.url));
 }
 assert.throws(()=>renderDesignSystemCss({fontBase:'https://fonts.googleapis.com/css'}));
});

test('a missing price renders to confirm and a supplied price is copied through',()=>{
 assert.equal(priceLabel(null),TO_CONFIRM);
 assert.equal(priceLabel('  '),TO_CONFIRM);
 assert.equal(priceLabel(' $40 '),'$40');
 assert.equal(priceLabel('Ask'),'Ask');
 const html=renderServices({category:'barber',items:[
  {name:'Cut',price:'$40'},
  {name:'Beard',price:null}
 ]},{idPrefix:'prices'});
 assert.equal(html.match(/\$/g)?.length,1);
 assert.match(html,/ds-unconfirmed">to confirm</);
 assert.match(html,/>\$40</);
});

test('an empty service list does not invent services or prices',()=>{
 const html=renderServices({category:'deli',items:[]},{idPrefix:'empty-menu'});
 assert.match(html,/Menu to confirm/);
 assert.doesNotMatch(html,/Sandwich|Haircut|\$|Monday/i);
});

test('reviews render nothing unless quote, author, and source are all present',()=>{
 assert.equal(renderReviews({reviews:null}),'');
 assert.equal(renderReviews({reviews:[]}),'');
 assert.equal(renderReviews({reviews:[{quote:'Nice',author:'Ada',source:' '}]}), '');
 assert.equal(visibleReviews([{quote:'Nice',author:' ',source:'Card'}]).length,0);
 const html=renderReviews({reviews:[{quote:'Example quotation.',author:'Example Customer',source:'Example source'}]},{idPrefix:'reviews'});
 assert.match(html,/data-section="reviews"/);
 assert.match(html,/Example quotation\./);
 assert.match(html,/Example Customer/);
 assert.match(html,/<cite>Example source<\/cite>/);
});

test('unknown hours and location use the to confirm placeholder',()=>{
 const html=renderHoursLocation({hoursLocation:null},{idPrefix:'hours'});
 assert.match(html,/data-section="hours"/);
 assert.equal(html.match(/to confirm/g)?.length,4);
 assert.doesNotMatch(html,/Monday|9\s*am|Open daily|Main Street/i);
 assert.doesNotMatch(html,/href="tel:/);
});

test('gallery keeps only images with alt text and a safe source',()=>{
 const html=renderGallery({images:[
  {src:'javascript:alert(1)',alt:'Bad'},
  {src:svg,alt:'  '},
  {src:`data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')}`,alt:'Script'},
  {src:svg,alt:'Example graphic for the test. Not a photograph.'}
 ]},{idPrefix:'gallery'});
 assert.equal(html.match(/<img/g)?.length,1);
 assert.match(html,/alt="Example graphic for the test\. Not a photograph\."/);
 assert.doesNotMatch(html,/javascript:|<script/i);
 assert.equal(renderGallery({images:[]}),'');
});

test('unsafe booking targets are not links',()=>{
 const html=renderHero({businessName:'Example',hero:{primaryAction:{label:'Book',href:'javascript:alert(1)'}}},{idPrefix:'hero'});
 assert.doesNotMatch(html,/javascript:/i);
 assert.match(html,/>to confirm</);
 assert.match(html,/<h1/);
});

test('footer always carries the internal disclaimer',()=>{
 const html=renderFooter({businessName:'Example',footer:{note:'Endorsed by the business'}},{idPrefix:'foot'});
 assert.match(html,/Internal concept, not endorsed by the business/);
 assert.match(html,/Endorsed by the business/);
 const footer=html.slice(html.indexOf('<footer'));
 assert.match(footer,/class="ds-footer-disclaimer">Internal concept, not endorsed by the business</);
});

test('a standalone page is noindex, has one h1, and does not load scripts or trackers',()=>{
 const html=renderSite({
  category:'barber',
  businessName:'<script>alert(1)</script>',
  hero:{support:'Example support'},
  services:[{name:'Cut',price:null}],
  about:{body:null},
  reviews:[{quote:'Hidden',author:'Nobody',source:''}]
 });
 assert.equal(html.match(/<h1[\s>]/g)?.length,1);
 assert.match(html,/name="robots" content="noindex, nofollow, noarchive"/);
 assert.match(html,/<main[\s>]/);
 assert.match(html,/<footer[\s>]/);
 assert.doesNotMatch(html,/<script/i);
 assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
 assert.doesNotMatch(html,/data-section="reviews"/);
 assert.doesNotMatch(html,/fonts\.googleapis|gtag|google-analytics|owner_approved/i);
 assert.equal(html.match(new RegExp(INTERNAL_DISCLAIMER,'g'))?.length,3);
 const footer=html.slice(html.indexOf('<footer'));
 assert.match(footer,/Internal concept, not endorsed by the business/);
 assert.ok(html.indexOf('<h1')<html.indexOf('<h2'));
});

test('embedded fragments demote the hero heading and keep section anchors unique',()=>{
 const html=renderSiteFragment({
  category:'hair-studio',
  businessName:'Example Hair Studio',
  gallery:[{src:svg,alt:'Example graphic for the embed test.'}],
  reviews:[{quote:'Example review.',author:'Example Customer',source:'Example source'}]
 },{idPrefix:'hair-studio',headingBase:2,embed:true});
 assert.equal(html.match(/<h1[\s>]/g)?.length??0,0);
 assert.match(html,/<h2/);
 assert.doesNotMatch(html,/<main[\s>]/);
 assert.match(html,/id="hair-studio-reviews"/);
 assert.match(html,/data-theme="hair-studio"/);
 assert.match(html,/data-motion="editorial"/);
});

test('phone and about placeholders stay honest',()=>{
 const hours=renderHoursLocation({hoursLocation:{phone:'call the shop',email:'not-an-email',address:'10 Example Avenue'}},{idPrefix:'contact'});
 assert.match(hours,/>call the shop</);
 assert.match(hours,/>not-an-email</);
 assert.doesNotMatch(hours,/href="tel:|href="mailto:/);
 const dialable=renderBooking({booking:{phone:'(555) 010-0100'}},{idPrefix:'book'});
 assert.match(dialable,/href="tel:5550100100"/);
 assert.match(dialable,/Booking link to confirm/);
 const about=renderAbout({category:'skin-care',about:null},{idPrefix:'about'});
 assert.match(about,/The studio/);
 assert.match(about,/to confirm/);
 assert.doesNotMatch(about,/years of experience|award-winning/i);
});

test('the committed gallery matches the builder and labels example data',()=>{
 const built=buildPreviewHtml();
 const committed=readFileSync(new URL('../qa/design-system/preview.html',import.meta.url),'utf8');
 assert.equal(committed,built);
 assert.match(built,/Design system preview/);
 assert.match(built,/All names, prices, hours, addresses, reviews, and images on this page are example data/);
 assert.match(built,/Internal concept, not endorsed by the business/);
 assert.match(built,/noindex, nofollow, noarchive/);
 for(const category of BUSINESS_CATEGORIES)assert.match(built,new RegExp(`data-theme="${category}"`));
 assert.match(built,/id="missing-reviews-output"[^>]*>\s*<\/div>/);
 assert.match(built,/Menu to confirm|Services to confirm/);
 assert.doesNotMatch(built,/<script|fonts\.googleapis|gtag\(/i);
 const images=[...built.matchAll(/<img\b[^>]*>/g)].map(match=>match[0]);
 assert.ok(images.length>=6);
 for(const image of images)assert.match(image,/alt="[^"]+\S[^"]*"/);
});
