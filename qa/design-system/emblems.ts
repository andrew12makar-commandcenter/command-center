// Synthetic graphics for the design-system gallery. Not photographs.

export type EmblemKind='barber'|'produce'|'convenience'|'skin'|'deli'|'hair';

const SHAPES:Record<EmblemKind,string>={
 barber:'<circle cx="320" cy="320" r="168" fill="none" stroke="ACCENT" stroke-width="10"/><path d="M320 170v300" stroke="INK" stroke-width="14" stroke-linecap="round"/>',
 produce:'<circle cx="320" cy="340" r="150" fill="none" stroke="INK" stroke-width="10"/><path d="M250 360c40-120 150-150 210-40" fill="none" stroke="ACCENT" stroke-width="14" stroke-linecap="round"/>',
 convenience:'<rect x="170" y="170" width="300" height="300" rx="28" fill="none" stroke="INK" stroke-width="12"/><rect x="250" y="250" width="140" height="140" fill="ACCENT"/>',
 skin:'<circle cx="270" cy="320" r="120" fill="none" stroke="INK" stroke-width="10"/><circle cx="370" cy="320" r="120" fill="none" stroke="ACCENT" stroke-width="10"/>',
 deli:'<circle cx="320" cy="250" r="70" fill="none" stroke="ACCENT" stroke-width="12"/><path d="M180 390h280M180 440h280M180 490h180" stroke="INK" stroke-width="12" stroke-linecap="round"/>',
 hair:'<path d="M220 160v320M320 160v320M420 160v320" stroke="INK" stroke-width="10" stroke-linecap="round"/><circle cx="320" cy="320" r="78" fill="none" stroke="ACCENT" stroke-width="12"/>'
};

export function emblemDataUri(kind:EmblemKind,ink:string,accent:string,paper:string):string{
 const shapes=SHAPES[kind].replaceAll('INK',ink).replaceAll('ACCENT',accent);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><rect width="640" height="640" fill="${paper}"/>${shapes}</svg>`;
 return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
