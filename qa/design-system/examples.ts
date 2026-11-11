// Synthetic fixtures for the gallery page. Every fact here is example data.
// Nothing in this file is a real business, price, hour, review, or address.

import type {BusinessCategory,DesignSite} from '../../lib/design-system/index.ts';
import {themeFor} from '../../lib/design-system/index.ts';
import {emblemDataUri,type EmblemKind} from './emblems.ts';

const KIND:Record<BusinessCategory,EmblemKind>={
 barber:'barber',
 'produce-market':'produce',
 convenience:'convenience',
 'skin-care':'skin',
 deli:'deli',
 'hair-studio':'hair'
};

function media(category:BusinessCategory,alt:string,caption:string){
 const theme=themeFor(category);
 const src=emblemDataUri(KIND[category],theme.colors.ink,theme.colors.accent,theme.colors.paper);
 return {src,alt,caption};
}

function gallery(category:BusinessCategory){
 const theme=themeFor(category);
 const kind=KIND[category];
 const label=theme.label;
 return [0,1,2].map(index=>({
  src:emblemDataUri(kind,index===1?theme.colors.accent:theme.colors.ink,index===2?theme.colors.paper:theme.colors.accent,index===1?theme.colors.paperDeep:theme.colors.card),
  alt:`Example graphic ${index+1} for the ${label} theme. Not a photograph of a business.`,
  caption:'Example data',
  credit:'Example graphic, not a shop photograph'
 }));
}

export const exampleSites:DesignSite[]=[
 {
  category:'barber',
  businessName:'Example Barber',
  hero:{
   eyebrow:'Example data · Barber',
   support:'Example supporting line for a barber theme. Not a real shop.',
   note:'Example note. Appointments in this preview are not bookable.',
   primaryAction:{label:'Example booking link',href:'https://example.com/book'},
   secondaryAction:{label:'(555) 010-0199',href:'tel:+15550100199'},
   media:media('barber','Example graphic for the barber theme. Not a photograph of a business.','Example graphic')
  },
  servicesNote:'Example prices. A missing price stays “to confirm”.',
  services:[
   {name:'Example haircut',detail:'Example service description.',duration:'30 min',price:'$40'},
   {name:'Example beard trim',detail:'No price was supplied for this row.',duration:'20 min',price:null}
  ],
  gallery:gallery('barber'),
  about:{body:'Example story supplied to show the about section. This is not the history of a real shop.',sourceNote:'Example source note.'},
  hoursLocation:{
   hours:'Example hours, not a real schedule.',
   address:'10 Example Avenue\nExample City',
   phone:'(555) 010-0199',
   email:'example@example.com',
   mapUrl:'https://example.com/map',
   note:'Example location note.'
  },
  booking:{
   body:'Example booking note. This does not reserve an appointment.',
   policies:['Example policy text'],
   action:{label:'Example booking link',href:'https://example.com/book'},
   phone:'(555) 010-0199'
  },
  footer:{note:'Example footer note for an internal concept.',sources:[{label:'Example source',href:'https://example.com/source'}]}
 },
 {
  category:'produce-market',
  businessName:'Example Produce Market',
  hero:{
   eyebrow:'Example data · Produce market',
   support:'Example supporting line for a produce market theme.',
   primaryAction:{label:'Example visit link',href:'https://example.com/visit'},
   media:media('produce-market','Example graphic for the produce market theme. Not a photograph of a business.','Example graphic')
  },
  servicesNote:'Example menu. One price is intentionally missing.',
  services:[
   {name:'Example apples',detail:'Example produce item.',price:'$3'},
   {name:'Example greens',detail:'Price was not supplied.',price:null}
  ],
  gallery:gallery('produce-market'),
  about:{body:'Example story for a produce market. Not a real market history.'},
  hoursLocation:{
   hours:'Example hours, not a real schedule.',
   address:null,
   phone:null,
   email:null
  },
  booking:{body:'Example note about asking the stand. No order is placed from this page.',action:{label:'Example contact link',href:'https://example.com/contact'}}
 },
 {
  category:'convenience',
  businessName:'Example Convenience Store',
  hero:{
   eyebrow:'Example data · Convenience store',
   support:'Example supporting line for a convenience store theme.',
   media:media('convenience','Example graphic for the convenience store theme. Not a photograph of a business.','Example graphic')
  },
  services:[
   {name:'Example grocery item',price:'$2'},
   {name:'Example household item',price:'$5'}
  ],
  servicesNote:'Example prices, not a shelf listing.',
  gallery:gallery('convenience'),
  about:{body:'Example story for a convenience store. Not a real store.'},
  hoursLocation:{hours:null,address:'20 Example Road\nExample City',phone:'(555) 010-0102'},
  booking:{body:'Example note. There is no online order in this preview.',phone:'(555) 010-0102'}
 },
 {
  category:'skin-care',
  businessName:'Example Skin Care',
  hero:{
   eyebrow:'Example data · Skin care',
   support:'Example supporting line for a skin care theme. No treatment claims.',
   media:media('skin-care','Example graphic for the skin care theme. Not a photograph of a business.','Example graphic')
  },
  servicesNote:'No example prices were supplied, so each row says to confirm.',
  services:[
   {name:'Example facial',duration:'50 min',price:null},
   {name:'Example consultation',duration:'20 min',price:null}
  ],
  gallery:gallery('skin-care'),
  about:{body:'Example story for a skin care studio. Not a real clinic and not medical advice.'},
  hoursLocation:{hours:'Example hours, not a real schedule.',address:'30 Example Lane\nExample City',email:'studio@example.com'},
  booking:{body:'Example booking note. Nothing here is an appointment.',action:{label:'Example request link',href:'https://example.com/request'}}
 },
 {
  category:'deli',
  businessName:'Example Deli',
  hero:{
   eyebrow:'Example data · Deli',
   support:'Example supporting line for a deli theme.',
   primaryAction:{label:'Example order link',href:'https://example.com/order'},
   media:media('deli','Example graphic for the deli theme. Not a photograph of a business.','Example graphic')
  },
  servicesNote:'Example menu prices. Not a real deli menu.',
  services:[
   {name:'Example sandwich',detail:'Example menu item.',price:'$12'},
   {name:'Example soup',detail:'Example menu item.',price:'$6'},
   {name:'Example salad',price:null}
  ],
  gallery:gallery('deli'),
  about:{body:'Example story for a deli counter. Not a real restaurant history.'},
  hoursLocation:{hours:'Example hours, not a real schedule.',address:'40 Example Street\nExample City',phone:'(555) 010-0140'},
  booking:{body:'Example note about calling ahead. This preview takes no orders.',action:{label:'Example call link',href:'tel:+15550100140'},phone:'(555) 010-0140'}
 },
 {
  category:'hair-studio',
  businessName:'Example Hair Studio',
  hero:{
   eyebrow:'Example data · Hair studio',
   support:'Example supporting line for a hair studio theme.',
   media:media('hair-studio','Example graphic for the hair studio theme. Not a photograph of a business.','Example graphic')
  },
  services:[
   {name:'Example cut and style',duration:'60 min',price:'$80'},
   {name:'Example color',duration:'90 min',price:null}
  ],
  servicesNote:'Example prices for the hair studio theme.',
  gallery:gallery('hair-studio'),
  about:{body:'Example story for a hair studio. Not a real salon history.'},
  hoursLocation:{hours:'Example hours, not a real schedule.',address:'50 Example Boulevard\nExample City',phone:'(555) 010-0150',email:'studio@example.com'},
  reviews:[
   {quote:'Example review quotation. Not a real customer.',author:'Example Customer',source:'Example review source'},
   {quote:'Second example review, included only to show a list.',author:'Example Neighbor',source:'Example review source'}
  ],
  booking:{body:'No booking link was supplied for this example.',phone:'(555) 010-0150'},
  footer:{note:'Example footer note. Reviews above are synthetic.'}
 }
];

export const missingReview={quote:'Example quotation without a source.',author:'Example Person',source:' '};
