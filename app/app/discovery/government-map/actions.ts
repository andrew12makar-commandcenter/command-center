'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace, shortText } from '@/lib/workspace';
import { governmentLocationKey, validateGovernmentLocationReview, type PresenceReviewStatus } from '@/lib/government-location-review';
import { readLatestGovernmentSnapshot, readGovernmentLocationReviews, saveGovernmentLocationReview } from './records';

export async function saveLocationReview(form: FormData): Promise<never> {
  await requireWorkspace(true);
  const candidateId = shortText(form.get('candidate_id'), 500);
  const requested = shortText(form.get('intent'), 30);
  const intent = requested === 'covered' ? 'covered' : requested === 'researching' ? 'researching' : '';
  if (!candidateId || !intent) redirect('/app/discovery/government-map?error=Choose+a+valid+review+action.');
  if (process.env.NODE_ENV !== 'development') redirect('/app/discovery/government-map?error=Location+review+is+available+only+in+the+local+Command+Center.');

  const snapshot = await readLatestGovernmentSnapshot();
  const candidate = snapshot?.candidates.find((row) => row.candidate_id === candidateId);
  if (!candidate) redirect('/app/discovery/government-map?error=That+government+source+row+is+not+in+the+current+local+snapshot.');
  const key = governmentLocationKey(candidate.name, candidate.address, candidate.zip);
  if (!key) redirect('/app/discovery/government-map?selected='+encodeURIComponent(candidateId)+'&error=This+source+row+needs+a+full+name,+address,+and+ZIP.');

  const validated = validateGovernmentLocationReview({
    name: candidate.name, address: candidate.address, zip: candidate.zip,
    googleProfileUrl: form.get('google_profile_url'), websiteUrl: form.get('website_url'), seoEvidenceUrl: form.get('seo_evidence_url'),
    evidenceNote: form.get('evidence_note'), websiteStrong: form.get('website_strong') === 'on',
    mapsProfileConfirmed: form.get('maps_profile_confirmed') === 'on', seoStrong: form.get('seo_strong') === 'on',
  }, intent as PresenceReviewStatus);
  if (!validated.review) redirect('/app/discovery/government-map?selected='+encodeURIComponent(candidateId)+'&error='+encodeURIComponent(validated.error||'Review could not be saved.'));

  const reviews = await readGovernmentLocationReviews();
  const existing = reviews[key];
  const review = intent === 'researching' && existing ? {...validated.review, status:'researching' as const} : validated.review;
  try { await saveGovernmentLocationReview(review); }
  catch { redirect('/app/discovery/government-map?selected='+encodeURIComponent(candidateId)+'&error=Could+not+save+the+local+review+file.'); }
  revalidatePath('/app/discovery/government-map');
  revalidatePath('/app/discovery/overture');
  redirect('/app/discovery/government-map?selected='+encodeURIComponent(candidateId)+'&saved='+intent);
}
