import Link from 'next/link';
import { createLead } from '../actions';
import { requireWorkspace } from '@/lib/workspace';

export default async function NewLead() {
  await requireWorkspace(true);
  return <main className="max-w-4xl">
    <Link href="/app/leads" className="muted text-sm">← Business CRM</Link>
    <p className="kicker mt-8">New prospect</p>
    <h1 className="mt-2 text-4xl font-semibold">Add a local business</h1>
    <p className="muted mt-3">New prospects start unverified. Enter what you know, not what an AI assumes.</p>
    <form action={createLead} className="panel mt-8 grid gap-5 p-7 md:grid-cols-2">
      <label className="text-sm md:col-span-2">Business name *<input className="mt-2" name="name" maxLength={180} required placeholder="Legal or public-facing business name" /></label>
      <label className="text-sm">Industry<input className="mt-2" name="category" placeholder="Roofing, landscaping, dental…" /></label>
      <label className="text-sm">City / town<input className="mt-2" name="city" placeholder="Brookline" /></label>
      <label className="text-sm">Street address (optional)<input className="mt-2" name="street_address" /></label>
      <label className="text-sm">ZIP code<input className="mt-2" name="postal_code" /></label>
      <label className="text-sm md:col-span-2">Service area for mobile businesses<input className="mt-2" name="service_area" placeholder="Greater Boston, no storefront" /></label>
      <label className="text-sm">Independent business website<input className="mt-2" type="url" name="website_url" placeholder="https://official-business-site.example" /><small className="muted mt-2 block">Do not paste Instagram, Facebook or directory listings here. Add those as social research evidence in the CRM after creating the prospect.</small></label>
      <label className="text-sm">Google Business Profile URL<input className="mt-2" name="google_business_url" placeholder="https://…" /></label>
      <label className="text-sm">Phone<input className="mt-2" name="phone" /></label>
      <label className="text-sm">Contact person (if known)<input className="mt-2" name="contact_name" /></label>
      <label className="text-sm md:col-span-2">Contact email<input type="email" className="mt-2" name="contact_email" /></label>
      <label className="text-sm">Opportunity score (optional, 0–100)<input type="number" min="0" max="100" className="mt-2" name="priority_score" /></label>
      <label className="text-sm">Why that score? (required if scored)<input className="mt-2" name="score_rationale" placeholder="Observed site problem + evidence…" /></label>
      <label className="text-sm md:col-span-2">Research notes<textarea name="notes" maxLength={3000} className="mt-2" rows={4} placeholder="Facts to verify, visit strategy, decision-maker questions…" /></label>
      <div className="md:col-span-2 flex items-center gap-4"><button className="btn" type="submit">Create prospect →</button><Link className="muted text-sm" href="/app/leads">Cancel</Link></div>
    </form>
  </main>;
}
