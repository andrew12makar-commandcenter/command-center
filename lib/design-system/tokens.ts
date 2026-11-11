// Design tokens: one type scale and spacing system, one color theme per
// small-business category. Text pairs are checked against WCAG AA in tests.

import {contrastRatio} from './contrast.ts';

export const BUSINESS_CATEGORIES=[
 'barber','produce-market','convenience','skin-care','deli','hair-studio'
] as const;
export type BusinessCategory=typeof BUSINESS_CATEGORIES[number];

export const TYPE_SCALE={
 display:'clamp(2.7rem, 6.4vw, 5rem)',
 title:'clamp(1.85rem, 3vw, 2.55rem)',
 heading:'1.35rem',
 body:'1.0625rem',
 small:'0.95rem',
 eyebrow:'0.78rem',
 lineBody:'1.55',
 lineDisplay:'0.96',
 trackingDisplay:'-0.03em',
 trackingEyebrow:'0.16em'
} as const;

export const SPACE={
 '3xs':'0.25rem',
 '2xs':'0.5rem',
 xs:'0.75rem',
 sm:'1rem',
 md:'1.5rem',
 lg:'2.25rem',
 xl:'3.25rem',
 '2xl':'4.75rem',
 section:'clamp(2.75rem, 6vw, 4.75rem)',
 wrap:'1120px',
 gutter:'1.25rem'
} as const;

export type MotionTemperament='editorial'|'calm'|'precise';

export type ThemeColors={
 paper:string;paperDeep:string;card:string;ink:string;muted:string;line:string;
 accent:string;accentHover:string;onAccent:string;
 banner:string;bannerText:string;
 onInk:string;onInkMuted:string;accentOnInk:string;focus:string;
};

export type DesignTheme={
 id:BusinessCategory;
 label:string;
 motion:MotionTemperament;
 radius:string;
 displayWeight:number;
 colors:ThemeColors;
};

const theme=(input:DesignTheme):DesignTheme=>input;

export const THEMES:Record<BusinessCategory,DesignTheme>={
 barber:theme({
  id:'barber',label:'Barber',motion:'editorial',radius:'16px',displayWeight:560,
  colors:{
   paper:'#f3eee4',paperDeep:'#e7dfd2',card:'#fbf8f2',ink:'#1c1612',muted:'#5c534a',line:'#ddd4c6',
   accent:'#7a2e22',accentHover:'#5c2218',onAccent:'#fffaf6',
   banner:'#241c18',bannerText:'#f6f1e8',
   onInk:'#f6f1e8',onInkMuted:'#e4d5c8',accentOnInk:'#f0c2b4',focus:'#7a2e22'
  }
 }),
 'produce-market':theme({
  id:'produce-market',label:'Produce market',motion:'calm',radius:'22px',displayWeight:560,
  colors:{
   paper:'#f3f6ee',paperDeep:'#e4ebdc',card:'#f8fbf4',ink:'#172214',muted:'#3d5136',line:'#d5e0cc',
   accent:'#1b5e2a',accentHover:'#144820',onAccent:'#f4fff6',
   banner:'#132016',bannerText:'#f3f7ef',
   onInk:'#f3f7ef',onInkMuted:'#d5e4d4',accentOnInk:'#b7e4c0',focus:'#1b5e2a'
  }
 }),
 convenience:theme({
  id:'convenience',label:'Convenience store',motion:'precise',radius:'6px',displayWeight:640,
  colors:{
   paper:'#f6f3ea',paperDeep:'#ebe4d4',card:'#fcfaf5',ink:'#1a1814',muted:'#534c43',line:'#e0d8c8',
   accent:'#8e2f0e',accentHover:'#6f240b',onAccent:'#fff7ed',
   banner:'#1c1917',bannerText:'#faf7f2',
   onInk:'#faf7f2',onInkMuted:'#e6d9c8',accentOnInk:'#fdba74',focus:'#8e2f0e'
  }
 }),
 'skin-care':theme({
  id:'skin-care',label:'Skin care',motion:'calm',radius:'28px',displayWeight:520,
  colors:{
   paper:'#f6f3ef',paperDeep:'#e9e2da',card:'#fbf9f6',ink:'#241c1b',muted:'#5c514c',line:'#e4dcd4',
   accent:'#6a3144',accentHover:'#522433',onAccent:'#fff8f6',
   banner:'#2a2224',bannerText:'#f8f3f1',
   onInk:'#f8f3f1',onInkMuted:'#e7d9d6',accentOnInk:'#f0c2ce',focus:'#6a3144'
  }
 }),
 deli:theme({
  id:'deli',label:'Deli',motion:'editorial',radius:'14px',displayWeight:580,
  colors:{
   paper:'#f7f1e4',paperDeep:'#efe4d0',card:'#fcf8f0',ink:'#24180f',muted:'#5c4636',line:'#eadcbe',
   accent:'#7a3412',accentHover:'#5e270e',onAccent:'#fff8f1',
   banner:'#2a1c12',bannerText:'#f8f1e6',
   onInk:'#f8f1e6',onInkMuted:'#ead8c4',accentOnInk:'#f0c09a',focus:'#7a3412'
  }
 }),
 'hair-studio':theme({
  id:'hair-studio',label:'Hair studio',motion:'editorial',radius:'2px',displayWeight:500,
  colors:{
   paper:'#f4f2f5',paperDeep:'#e7e3ea',card:'#fbfafc',ink:'#1b1522',muted:'#51475c',line:'#ddd6e4',
   accent:'#4c2468',accentHover:'#3a1a50',onAccent:'#fbf7ff',
   banner:'#1a1420',bannerText:'#f6f2f8',
   onInk:'#f7f3f8',onInkMuted:'#ddd4e4',accentOnInk:'#e4c6f5',focus:'#4c2468'
  }
 })
};

export const MIN_TEXT_CONTRAST=4.5;

export function isBusinessCategory(value:string):value is BusinessCategory{
 return (BUSINESS_CATEGORIES as readonly string[]).includes(value);
}

export function themeFor(category:BusinessCategory):DesignTheme{
 const theme=THEMES[category];
 if(!theme)throw new Error(`Unknown business category: ${String(category)}`);
 return theme;
}

/** Foreground/background pairs used for text in each theme. */
export function themeTextPairs(theme:DesignTheme):Array<[string,string,string]>{
 const c=theme.colors;
 return [
  ['ink on paper',c.ink,c.paper],
  ['ink on card',c.ink,c.card],
  ['ink on paperDeep',c.ink,c.paperDeep],
  ['muted on paper',c.muted,c.paper],
  ['muted on card',c.muted,c.card],
  ['accent on paper',c.accent,c.paper],
  ['accent on card',c.accent,c.card],
  ['onAccent on accent',c.onAccent,c.accent],
  ['onAccent on accentHover',c.onAccent,c.accentHover],
  ['bannerText on banner',c.bannerText,c.banner],
  ['onInk on ink',c.onInk,c.ink],
  ['onInkMuted on ink',c.onInkMuted,c.ink],
  ['accentOnInk on ink',c.accentOnInk,c.ink],
  ['paper on ink',c.paper,c.ink]
 ];
}

export function themeContrastFailures(theme:DesignTheme,minimum=MIN_TEXT_CONTRAST):string[]{
 return themeTextPairs(theme).flatMap(([label,foreground,background])=>{
  const ratio=contrastRatio(foreground,background);
  return ratio>=minimum?[]:[`${theme.id}: ${label} is ${ratio.toFixed(2)}:1`];
 });
}

export const SECTION_ORDER=['hero','services','gallery','about','hours','reviews','booking','footer'] as const;

export const FONT_FILES={
 display:'fraunces-9e509503.woff2',
 body:'sourcesans3-e6c9ca63.woff2'
} as const;

/** Structural section labels. These are not business facts. */
export function defaultServicesHeading(category:BusinessCategory):string{
 if(category==='deli'||category==='produce-market'||category==='convenience')return 'Menu';
 return 'Services';
}

export function defaultAboutHeading(category:BusinessCategory):string{
 switch(category){
  case 'barber':return 'The shop';
  case 'hair-studio':return 'The studio';
  case 'skin-care':return 'The studio';
  case 'produce-market':return 'The market';
  case 'convenience':return 'The store';
  case 'deli':return 'The counter';
 }
}
