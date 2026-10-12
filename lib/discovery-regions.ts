// Configurable discovery geography. Areas are grouped into expansion rings so
// coverage can grow outward without hardcoding the system to three places.
//
// Boxes are deliberately generous approximations (WGS84, lon/lat) for
// candidate discovery only. They overlap neighbours, so every candidate also
// keeps its own recorded locality/postcode, and the review step decides.
export type BBox={west:number;south:number;east:number;north:number};
export type DiscoveryArea={id:string;label:string;ring:1|2|3;bbox:BBox;postcodes?:string[]};

export const DISCOVERY_AREAS:DiscoveryArea[]=[
 {id:'allston',label:'Allston',ring:1,bbox:{west:-71.145,south:42.345,east:-71.112,north:42.372},postcodes:['02134','02163']},
 {id:'brighton',label:'Brighton',ring:1,bbox:{west:-71.178,south:42.333,east:-71.135,north:42.366},postcodes:['02135']},
 {id:'brookline',label:'Brookline',ring:1,bbox:{west:-71.18,south:42.296,east:-71.105,north:42.346},postcodes:['02445','02446','02447','02467']},
 {id:'newton',label:'Newton',ring:2,bbox:{west:-71.27,south:42.283,east:-71.157,north:42.37},postcodes:['02458','02459','02460','02461','02462','02464','02465','02466','02467','02468']},
 {id:'watertown',label:'Watertown',ring:2,bbox:{west:-71.21,south:42.355,east:-71.155,north:42.385},postcodes:['02472']},
 {id:'cambridge',label:'Cambridge',ring:2,bbox:{west:-71.161,south:42.352,east:-71.064,north:42.404},postcodes:['02138','02139','02140','02141','02142']},
 {id:'somerville',label:'Somerville',ring:2,bbox:{west:-71.135,south:42.373,east:-71.073,north:42.418},postcodes:['02143','02144','02145']},
 {id:'fenway-back-bay',label:'Fenway / Back Bay',ring:3,bbox:{west:-71.111,south:42.336,east:-71.07,north:42.356},postcodes:['02115','02215','02116','02199']},
 {id:'jamaica-plain',label:'Jamaica Plain',ring:3,bbox:{west:-71.13,south:42.293,east:-71.095,north:42.33},postcodes:['02130']},
 {id:'south-end-roxbury',label:'South End / Roxbury',ring:3,bbox:{west:-71.1,south:42.31,east:-71.06,north:42.347},postcodes:['02118','02119','02120','02121']}
];

export function validBBox(b:BBox):boolean{
 return [b.west,b.south,b.east,b.north].every(Number.isFinite)&&
  b.west<b.east&&b.south<b.north&&b.west>=-180&&b.east<=180&&b.south>=-90&&b.north<=90&&
  // Hard ceiling (~0.4° each way) keeps a single query bounded and cheap.
  b.east-b.west<=0.4&&b.north-b.south<=0.4;
}

export function selectAreas(spec:{areas?:string[];ring?:number}):DiscoveryArea[]{
 let chosen=DISCOVERY_AREAS;
 if(spec.areas?.length){
  const unknown=spec.areas.filter(id=>!DISCOVERY_AREAS.some(a=>a.id===id));
  if(unknown.length)throw Error('Unknown discovery area: '+unknown.join(', ')+'. Known: '+DISCOVERY_AREAS.map(a=>a.id).join(', '));
  chosen=DISCOVERY_AREAS.filter(a=>spec.areas!.includes(a.id));
 }else if(spec.ring){
  chosen=DISCOVERY_AREAS.filter(a=>a.ring<=spec.ring!);
 }else chosen=DISCOVERY_AREAS.filter(a=>a.ring===1);
 if(!chosen.length)throw Error('No discovery areas selected.');
 return chosen;
}

export function inBBox(b:BBox,lon:number,lat:number):boolean{
 return lon>=b.west&&lon<=b.east&&lat>=b.south&&lat<=b.north;
}
