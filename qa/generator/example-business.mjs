// Synthetic fixture for the generator audit. Every name, service, address,
// phone (555-01xx) and sentence below is example data. It is not a real shop.
import {createDraft, defaultPreferences} from '../../lib/demo-engine.ts';
import {buildSiteBlueprint} from '../../lib/site-blueprint.ts';
import {resolveDemoTemplate} from '../../lib/business-classification.ts';
import {getMatchedConceptSet} from '../../lib/concept-imagery.ts';
import {composePage} from '../../lib/generator-loop/compose.ts';
import {deriveTraits, traitDefaults} from '../../lib/generator-loop/design-space.ts';
import {renderPlanHtml} from '../../lib/generator-loop/render.ts';

export const EXAMPLE_NAME = 'Example Data Barbers';
export const EXAMPLE_CITY = 'Example City';
export const EXAMPLE_CATEGORY = 'barber';
export const EXAMPLE_PHONE = '555-0100';
export const EXAMPLE_EMAIL = 'example-data@example.org';
export const EXAMPLE_SERVICES = [
  'Example data haircut',
  'Example data shave',
  'Example data beard trim',
];
export const EXAMPLE_ABOUT =
  'Example data. This about text is example data for Example Data Barbers in Example City. It is not a description of a real shop. None of the services, staff, prices, or hours are real.';

export function exampleFacts() {
  return {
    id: 'example-data-barbers',
    name: EXAMPLE_NAME,
    industry: 'barber',
    city: EXAMPLE_CITY,
    about: EXAMPLE_ABOUT,
    offerings: [...EXAMPLE_SERVICES],
    conversion: 'book',
    conversionUrl: null,
    phone: EXAMPLE_PHONE,
    email: EXAMPLE_EMAIL,
    address: '1 Example Data Street, Example City',
    hours: ['Example data hours — not a real schedule'],
    imagery: {
      generatedAllowed: false,
      authorizedHost: null,
      businessImages: [],
      generated: [],
    },
  };
}

/** Production blueprint. factStatus stays unreviewed. Never owner_approved. */
export function buildExampleBlueprint() {
  const resolved = resolveDemoTemplate(EXAMPLE_NAME, EXAMPLE_CATEGORY, 'auto');
  const draft = createDraft(
    EXAMPLE_NAME,
    EXAMPLE_CITY,
    EXAMPLE_CATEGORY,
    resolved.template,
    defaultPreferences(),
  );
  draft.services = [...EXAMPLE_SERVICES];
  draft.siteContent = {
    ...draft.siteContent,
    about: EXAMPLE_ABOUT,
    audience: 'Example data audience',
    sourceUrl: 'https://example.org/example-data-barbers',
    appointmentUrl: null,
    factStatus: 'unreviewed',
    heroTreatment: 'typographic',
    images: [],
    generatedImageryEnabled: true,
  };
  const site = buildSiteBlueprint(resolved.template, draft, {
    name: EXAMPLE_NAME,
    city: EXAMPLE_CITY,
    phone: EXAMPLE_PHONE,
    email: EXAMPLE_EMAIL,
    category: EXAMPLE_CATEGORY,
  });
  if (site.content.factStatus === 'owner_approved') {
    throw new Error('Example fixture must not set owner_approved.');
  }
  const conceptMedia = getMatchedConceptSet(
    site.template,
    site.category,
    site.services,
    site.businessName,
  );
  return {site, resolved, conceptMedia: conceptMedia ?? null};
}

/** Feedback-loop harness HTML for the same example facts. Not the shipped renderer. */
export function buildExampleLoop() {
  const facts = exampleFacts();
  const candidate = traitDefaults(deriveTraits(facts), facts.id);
  const plan = composePage(facts, candidate);
  const html = renderPlanHtml(plan, facts.name);
  return {facts, candidate, plan, html};
}
