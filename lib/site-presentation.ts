import {safePublicUrl,type SiteBlueprint} from './site-blueprint.ts';
import {classifyIndustry} from './business-classification.ts';

// A composition is a design-system decision, not just a different hero grid.
// The same vertical has multiple credible families. The service count matters
// because empty/filler cards are worse than a clean service index.
export type ServicePresentation='clinical-index'|'care-editorial'|'project-panels'|'craft-index'|'advisory-grid'|'professional-index';
export type SectionPresentation={services:ServicePresentation;journey:'care-path'|'quote-path'|'estimate-path'|'consult-path';gallery:'editorial'|'project-grid'|'quiet'};

export function selectSectionPresentation(site:Pick<SiteBlueprint,'template'|'services'|'design'|'businessName'|'category'>):SectionPresentation{
 const family=site.design.composition;
 const count=site.services.length;
 if(site.template==='medical')return {
  services:family==='service-index'||count>6?'clinical-index':'care-editorial',
  journey:'care-path',gallery:family==='immersive'?'editorial':'quiet'
 };
 if(site.template==='landscaping')return {
  services:(family==='immersive'||family==='bento')&&count>=3?'project-panels':'craft-index',
  journey:'quote-path',gallery:'project-grid'
 };
 if(classifyIndustry(site.businessName,site.category).sector==='trades')return {
  services:'craft-index',journey:'estimate-path',gallery:'quiet'
 };
 return {
  services:(family==='bento'||family==='centered')&&count>=3?'advisory-grid':'professional-index',
  journey:'consult-path',gallery:family==='immersive'?'editorial':'quiet'
 };
}

export type ContactStep={title:string;description:string};
export type PrimaryContactAction={href:string;label:string;target?:'_blank';rel?:'noopener noreferrer'};

/** Give the main demo CTA a real, confirmed contact destination when one exists. */
export function primaryContactAction(site:Pick<SiteBlueprint,'primaryAction'|'contact'|'content'>):PrimaryContactAction|null{
 const appointment=safePublicUrl(site.content.appointmentUrl);
 if(appointment)return {href:appointment,label:site.primaryAction,target:'_blank',rel:'noopener noreferrer'};
 const phone=site.contact.phone?.trim()||'';
 const digits=phone.replace(/[^+0-9]/g,'');
 if(/\d/.test(digits))return {href:'tel:'+digits,label:'Call us'};
 const email=site.contact.email?.trim()||'';
 if(email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  return {href:'mailto:'+encodeURIComponent(email),label:'Email us'};
 return null;
}

export function contactJourney(kind:SectionPresentation['journey'],hasAppointment:boolean):[ContactStep,ContactStep,ContactStep]{
 if(kind==='care-path')return [
  {title:'Explore care',description:'Review the listed services and available practice information.'},
  {title:'Ask questions',description:'Contact the practice directly about your needs and availability.'},
  {title:'Get in touch',description:hasAppointment?'Use the listed appointment request when ready.':'Use the confirmed contact details to ask about an appointment.'}
 ];
 if(kind==='quote-path')return [
  {title:'Explore services',description:'Review the listed landscape services and project options.'},
  {title:'Discuss your project',description:'Share the property needs and timing with the business.'},
  {title:'Request details',description:'Use the confirmed contact method to ask about an estimate.'}
 ];
 if(kind==='estimate-path')return [
  {title:'Review capabilities',description:'Explore the home-service work listed for the company.'},
  {title:'Discuss the scope',description:'Share the project details and timing with the business.'},
  {title:'Request an estimate',description:'Use the confirmed contact method to discuss pricing and next steps.'}
 ];
 return [
  {title:'Discover',description:'Read the listed services and the business overview.'},
  {title:'Discuss',description:'Contact the business about the scope of your needs.'},
  {title:'Move forward',description:'Use the confirmed contact method to arrange next steps.'}
 ];
}
