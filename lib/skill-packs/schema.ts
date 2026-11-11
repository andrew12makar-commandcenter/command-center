// Version 1 skill packs are data and templates. They are never executable code,
// and they cannot approve facts or fetch anything over the network.
export const SKILL_PACK_FORMAT=1 as const;
export const INTERNAL_CONCEPT_DISCLAIMER='Internal concept, not endorsed by the business' as const;
export const PREVIEW_ROBOTS='noindex, nofollow' as const;

export const COMPOSITIONS=['split-editorial','immersive','bento','service-index','centered','asymmetric'] as const;
export const MOTION_STYLES=['calm','cinematic','precise'] as const;
export const PAGE_ENTRIES=['soft-rise','cinematic-wipe','precision-reveal'] as const;
export const SECTION_REVEALS=['cascade','layered-wipe','indexed-rise'] as const;
export const MEDIA_MOTIONS=['slow-scale','masked-reveal','depth-shift'] as const;
export const NAV_MOTIONS=['underline-track','pill-shift'] as const;
export const SECTION_KINDS=['hero','offer','gallery','proof','team','process','story','faq','area','visit','contact','scene','rooms','overlay','toolbar'] as const;
export const GENERATOR_SECTIONS=['hero','services','trust','about','contact','proof','process','gallery','visit'] as const;
export const PLACEMENTS=['viewport','top-start','top-end','bottom-dock','dialog','overlay'] as const;
export const CHECK_RULES=['keeps-internal-disclaimer','noindex','reduced-motion-static','no-owner-approval','no-external-url','motion-duration-cap','section-present'] as const;
export const REQUIRED_CHECK_RULES=['keeps-internal-disclaimer','noindex','reduced-motion-static','no-owner-approval','no-external-url'] as const;

export type Composition=(typeof COMPOSITIONS)[number];
export type MotionStyle=(typeof MOTION_STYLES)[number];
export type SectionKind=(typeof SECTION_KINDS)[number];
export type CheckRule=(typeof CHECK_RULES)[number];

export type DesignTokens={
 color:Record<string,string>;
 font:{display:string;body:string};
 radius:Record<string,string>;
 space:Record<string,string>;
};
export type SectionTemplate={id:string;kind:SectionKind;slots:string[];template:string};
export type MotionPreset={
 id:string;style:MotionStyle;reducedMotion:'static';
 durationMs:number;staggerMs:number;
 pageEntry:(typeof PAGE_ENTRIES)[number];
 sectionReveal:(typeof SECTION_REVEALS)[number];
 mediaMotion:(typeof MEDIA_MOTIONS)[number];
 navigationMotion:(typeof NAV_MOTIONS)[number];
};
export type LayoutRegion={id:string;placement:(typeof PLACEMENTS)[number]};
export type LayoutRecipe={
 id:string;composition:Composition;sectionOrder:string[];
 regions:LayoutRegion[];motionId?:string;
 breakpoints?:{maxWidth:number;note:string}[];
};
export type CopyGuidance={
 id:string;headingSlots:string[];bodySlots:string[];
 guidance:string[];forbidden:string[];
 disclaimer:typeof INTERNAL_CONCEPT_DISCLAIMER;
};
export type QualityCheck={
 id:string;severity:'block'|'warn';rule:CheckRule;detail:string;
 maxMs?:number;sectionId?:string;
};
export type SkillPackManifest={
 format:typeof SKILL_PACK_FORMAT;id:string;name:string;version:string;
 example:boolean;description:string;appliesTo:string[];sourceNote:string;
};
export type SkillPackBody={
 format:typeof SKILL_PACK_FORMAT;
 tokens:DesignTokens;sections:SectionTemplate[];motion:MotionPreset[];
 layouts:LayoutRecipe[];copy:CopyGuidance[];checks:QualityCheck[];
};
export type SkillPackRegistryEntry={
 id:string;version:string;example:boolean;active:boolean;path:string;
};
export type SkillPackRegistry={format:typeof SKILL_PACK_FORMAT;packs:SkillPackRegistryEntry[]};
export type LoadedSkillPack={manifest:SkillPackManifest;pack:SkillPackBody;readme?:string};
