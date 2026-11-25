import {opportunityLabels,strengthLabels,confidenceLabels,nextActionLabels,evidenceStateLabels,progressLabels,formatLocation,type Qualification,type Opportunity} from './prospect-qualification.ts';
import {targetServiceLabels,type Campaign} from './discovery-campaigns.ts';
import type {SalesBrief} from './sales-brief.ts';
import {classifyGoogleListingLink} from './google-listing-link.ts';

// Internal, evidence-bounded pitch preparation. Never a public claim or a proposal.
export type PitchInput={
 business:{name:string;category:string|null;street_address:string|null;city:string|null;state:string|null;postal_code:string|null;
  website_url:string|null;google_business_url:string|null;verification_status:string;operational_status:string;
  contact_name:string|null;service_area:string|null};
 campaign:Pick<Campaign,'name'|'target_service'|'target_area'|'target_industry'>|null;
 q:Qualification;sales:SalesBrief;auditUrl:string|null;
 sources:{url:string;label:string}[];demoUrl:string|null;generatedAt:string;
};
export type PitchBrief={
 title:string;location:string;locationVerified:boolean;campaign:string;opportunity:string;secondary:string;
 score:string;scoreLines:string[];verifyFirst:string[];progress:string;
 evidence:string[];confidence:string;unknowns:string[];openingOffer:string;
 links:{label:string;url:string}[];auditSummary:string[];nextAction:string;demoUrl:string|null;
 doNotClaim:string[];sources:{label:string;url:string}[];markdown:string;
};
const offers:Record<Opportunity,string>={
 gbp:'Offer a free Google Business Profile check: confirm a listing exists and who controls it, then offer setup or cleanup of hours, categories, services and photos.',
 website_design:'Offer a short mobile website review plus an internal concept demo, shown for the owner\'s feedback before any proposal.',
 geolocation_pages:'Offer a review of how the business\'s recorded service areas appear on its site, then propose a small set of accurate service-area pages.',
 local_seo:'Offer a short local SEO review of the basics already checked (page description, LocalBusiness structured data, sitemap) with a prioritized fix list.',
 no_clear_opportunity:'No offer yet. Recorded evidence shows no clear gap; only approach if new research changes that.',
 unknown:'No offer yet. Finish the next research action before pitching.'
};
const safeUrl=(v:string|null|undefined)=>{try{const u=new URL(v||'');return ['http:','https:'].includes(u.protocol)?u.toString():null;}catch{return null;}};
export function buildPitchBrief(i:PitchInput):PitchBrief{
 const b=i.business,q=i.q;
 const gbpLink=classifyGoogleListingLink(b.google_business_url);
 const crmVerified=b.verification_status==='verified'&&b.operational_status==='operating';
 // Identity and activity review do not confirm that the business operates at this exact address.
 const locationVerified=crmVerified;
 const place=formatLocation(b.street_address,b.city,b.state,b.postal_code);
 const location=place+(crmVerified?' (verified, operating)':q.identityConfirmed&&q.activeConfirmed?
  ' (identity and operation review recorded'+(q.reviewedAt?' '+q.reviewedAt.slice(0,10):'')+'; this address is not CRM-verified)':
  ' (as recorded; not verified)');
 const evidence=[...q.reasons.filter(r=>!r.startsWith('Manually set')&&!r.startsWith('Secondary')),
  `Website: ${evidenceStateLabels[q.websiteState]}. GBP: ${evidenceStateLabels[q.gbpState]}.`,
  ...(q.websiteIssues.length?['Free website check found: '+q.websiteIssues.join('; ')+'.']:[]),
  ...(q.reviewNote?['Review note: '+q.reviewNote]:[]),
  ...i.sales.observations.filter(o=>o.kind==='measured').slice(0,4).map(o=>`${o.label}: ${o.value} (${i.sales.sourceLabel}${i.sales.assessedAt?', '+i.sales.assessedAt.slice(0,10):''}).`)];
 const unknowns:string[]=[];
 if(!locationVerified)unknowns.push('Whether the business is currently operating at this exact address (not confirmed in the CRM).');
 if(q.websiteState==='unknown')unknowns.push(q.websitePresence==='official_site_recorded'?'The current state of the recorded website (not yet checked).':'Whether an official website exists that is not yet recorded.');
 if(q.gbpState==='unknown')unknowns.push('Whether a Google Business Profile exists and who manages it.');
 if(i.sales.confidence==='unmeasured'&&q.websiteState!=='verified_missing')unknowns.push(q.websiteIssues.length||q.websiteState==='verified_present'?'Website speed (only a free basics check was run; no Lighthouse audit).':'Website performance and SEO (no audit recorded).');
 if(i.sales.confidence==='inconclusive')unknowns.push('Website performance and SEO (latest audit inconclusive).');
 if(q.contactReadiness!=='ready')unknowns.push('Who the decision maker is and how to reach them.');
 if(q.primaryOpportunity==='geolocation_pages'&&!b.service_area)unknowns.push('The exact areas the business serves.');
 unknowns.push('The owner\'s goals, priorities and ability to invest (never assumed).');
 let offer=q.recommendedOutsideCampaign?offers[q.recommended]+' (Best-supported service; outside the campaign focus of '+opportunityLabels[q.primaryOpportunity]+'.)':offers[q.primaryOpportunity];
 if(q.primaryOpportunity==='website_design'&&q.websitePresence==='ordering_only')
  offer='Confirm whether they have an independent website. If not, ask whether a simple site beside their ordering page would be useful; do not assume the ordering page is their only web presence.';
 if(q.primaryOpportunity==='website_design'&&q.websitePresence==='social_only')
  offer='Ask whether they have a website they control. If not, offer a simple concept site built from their real details, shown for feedback only.';
 const doNotClaim=['Do not estimate revenue, traffic, rankings, leads or return on investment.','Do not guarantee results or timelines.'];
 if(q.websiteState!=='verified_missing'&&q.websitePresence!=='official_site_recorded')doNotClaim.push('Do not say the business has no website; none is recorded, which is not proof.');
 if(q.gbpState==='unknown'||q.gbpState==='conflicting')doNotClaim.push('Do not say the business has no Google Business Profile; it has not been confirmed either way.');
 if(q.gbpState==='likely_weak')doNotClaim.push('Describe GBP gaps only as observed (for example missing hours or website); do not claim ranking effects.');
 if(gbpLink.kind==='search')doNotClaim.push('The stored Google Maps link is a search, not an exact business listing. Do not present it as a verified GBP URL.');
 if(gbpLink.kind==='unverified_link')doNotClaim.push('The stored Google Maps link does not provide a confirmed listing ID. Verify the specific listing before citing it.');
 if(q.legalStructure)doNotClaim.push('Do not describe their industry from the legal structure ('+q.legalStructure+').');
 if(q.websitePresence==='social_only')doNotClaim.push('Do not criticize their social page as a substitute for a website.');
 if(q.websitePresence==='ordering_only')doNotClaim.push('A third-party ordering page is recorded, but that does not prove whether an independent business website exists.');
 if(i.sales.confidence!=='measured')doNotClaim.push(q.websiteIssues.length?'Do not make speed claims; SEO points are limited to the basics the free check observed.':'Do not make performance or SEO claims; no reliable measurement is recorded.');
 if(!locationVerified)doNotClaim.push('Do not state the business is operating at this exact address until the CRM location verification is complete.');
 doNotClaim.push('Do not claim the demo is faster or better-ranking; it has not been benchmarked.');
 for(const c of i.sales.cautions)if(!doNotClaim.includes(c))doNotClaim.push(c);
 const links=[
  ...(safeUrl(b.website_url)?[{label:'Website',url:safeUrl(b.website_url)!}]:[]),
  ...(gbpLink.url?[{label:gbpLink.kind==='specific_id'?'Google Business Profile':gbpLink.kind==='search'?'Google Maps search (listing unverified)':'Google Maps link (identity unverified)',url:gbpLink.url}]:[])
 ];
 const auditSummary=i.sales.confidence==='unmeasured'?['No website audit recorded.']:[
  `${i.sales.sourceLabel}${i.sales.assessedAt?', '+i.sales.assessedAt.slice(0,10):''} (${i.sales.confidence.replaceAll('_',' ')}).`,
  ...i.sales.observations.slice(0,6).map(o=>`${o.label}: ${o.value}${o.kind==='estimated'?' (Lighthouse estimate)':''}`)];
 const seen=new Set<string>();
 const sources=[...i.sources,...links,...(safeUrl(i.auditUrl)?[{label:'Audited URL',url:safeUrl(i.auditUrl)!}]:[])]
  .map(s=>({label:s.label,url:safeUrl(s.url)})).filter((s):s is {label:string;url:string}=>Boolean(s.url)&&!seen.has(s.url!)&&Boolean(seen.add(s.url!)));
 const campaign=i.campaign?`${i.campaign.name} (${targetServiceLabels[i.campaign.target_service]}${i.campaign.target_area?', '+i.campaign.target_area:''})`:'No campaign recorded';
 const opportunity=`${opportunityLabels[q.primaryOpportunity]} · ${strengthLabels[q.opportunityStrength]}`;
 const secondaryLanes=q.recommendedOutsideCampaign?[q.recommended,...q.secondary.filter(l=>l!==q.recommended)]:q.secondary;
 const secondary=secondaryLanes.length?secondaryLanes.map(l=>opportunityLabels[l]).join(', '):'None supported by evidence yet';
 const score=q.score+'/100';
 const scoreLines=[...q.parts.map(p=>`${p.label}: ${p.points}/${p.max} (${p.why.join(' ')})`),...q.penalties.map(p=>`Penalty, ${p.label}: ${p.points}`)];
 const verifyFirst=q.tasks.length?q.tasks:['Nothing outstanding in recorded evidence; still confirm details on first contact.'];
 const title=b.name+': pitch brief';
 const list=(xs:string[])=>xs.map(x=>'- '+x).join('\n');
 const markdown=[`# ${title}`,`_Internal only. Prepared ${i.generatedAt.slice(0,10)}. Not a proposal._`,'',
  `**Location:** ${location}`,`**Category:** ${b.category||'Not recorded'}`,`**Campaign:** ${campaign}`,
  `**Primary opportunity:** ${opportunity}`,`**Secondary opportunity:** ${secondary}`,
  `**Qualification score:** ${score} (${progressLabels[q.progress]})`,`**Evidence confidence:** ${confidenceLabels[q.evidenceConfidence]}`,
  `**Recommended next action:** ${nextActionLabels[q.nextAction]}`,'',
  '## Recommended opening offer',offer,'','## Verify before contacting',list(verifyFirst),'','## Supporting evidence',list(evidence),'',
  '## Score breakdown',list(scoreLines),'','## Important unknowns',list(unknowns),'',
  '## Website audit summary',list(auditSummary),'','## Existing links',links.length?list(links.map(l=>`${l.label}: ${l.url}`)):'- None recorded','',
  '## Website demo',i.demoUrl?`- Internal demo draft: ${i.demoUrl} (not shared publicly)`:'- No demo yet','',
  '## Claims that must not be made',list(doNotClaim),'','## Sources',sources.length?list(sources.map(s=>`${s.label}: ${s.url}`)):'- None recorded'
 ].join('\n');
 return {title,location,locationVerified,campaign,opportunity,secondary,score,scoreLines,verifyFirst,progress:progressLabels[q.progress],evidence,confidence:confidenceLabels[q.evidenceConfidence],
  unknowns,openingOffer:offer,links,auditSummary,nextAction:nextActionLabels[q.nextAction],demoUrl:i.demoUrl,doNotClaim,sources,markdown};
}
