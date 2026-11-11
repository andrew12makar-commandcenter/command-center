// WCAG 2.x relative luminance and contrast for design-token checks.

function channel(value:number):number{
 const c=value/255;
 return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;
}

export function relativeLuminance(hex:string):number{
 const match=/^#([0-9a-f]{6})$/i.exec(hex.trim());
 if(!match)throw new Error(`Expected a #rrggbb color, received ${hex}`);
 const raw=parseInt(match[1],16);
 const red=(raw>>16)&255, green=(raw>>8)&255, blue=raw&255;
 return 0.2126*channel(red)+0.7152*channel(green)+0.0722*channel(blue);
}

export function contrastRatio(foreground:string,background:string):number{
 const lighter=Math.max(relativeLuminance(foreground),relativeLuminance(background));
 const darker=Math.min(relativeLuminance(foreground),relativeLuminance(background));
 return (lighter+0.05)/(darker+0.05);
}
