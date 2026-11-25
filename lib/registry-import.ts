// A registered/principal office from an entity filing is not a verified
// customer-facing location. Keep it separate until a local source or operator
// review identifies the actual business premises.
export type RegistryLocationInput={sourceType:string;city:string;address:string;postcode:string;};
export type RegistryLocationOutput={isEntityRegistry:boolean;city:string;street:string;postcode:string;registryCity:string|null;registryAddress:string|null;};

export function isEntityRegistrySource(sourceType:string):boolean{
 return /\b(?:massachusetts|ma)\b.*\b(?:corporations?|entities?|registry|corp(?:orations?)?\s+book)|\b(?:corporation|entity)\s+registry\b/i.test(sourceType);
}
export function hasEntityRegistryContext(raw:Record<string,unknown>|null|undefined):boolean{
 return raw?.registry_context==='entity_filing';
}

export function splitRegistryLocation(input:RegistryLocationInput):RegistryLocationOutput{
 const isEntityRegistry=isEntityRegistrySource(input.sourceType);
 return isEntityRegistry
  ?{isEntityRegistry,city:'',street:'',postcode:'',registryCity:input.city||null,registryAddress:input.address||null}
  :{isEntityRegistry,city:input.city,street:input.address,postcode:input.postcode,registryCity:null,registryAddress:null};
}
