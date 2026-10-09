# Command Center

Private Next.js command center for a local-business services venture, designed to support a separate MCAT module later. This repository is **not** affiliated with the Campus2Care codebase.

## Requirements
- Node.js **24 LTS** (recommended; use a version manager with `.nvmrc`)
- npm
- A **separate** Supabase project, created under the for-profit venture
- Optional Vercel project for deployment

## Run locally
```bash
git clone https://github.com/andrew12makar-commandcenter/command-center.git
cd command-center
npm install
cp .env.example .env.local
npm run dev
```
Visit http://localhost:3000. Without Supabase credentials, the public holding page works and private routes display a setup message.

## Connect Supabase
1. Create a **new Supabase project** for Command Center.
2. In the SQL editor, run `supabase/migrations/0001_foundation.sql`.
3. Copy project URL and **publishable** API key into `.env.local`; never commit secrets.
4. Create your first user in Supabase Authentication.
5. From the SQL editor (admin-only), replace the user ID below with the auth user ID, then run:

```sql
with org as (
  insert into public.organizations(name) values ('Command Center') returning id
)
insert into public.organization_members (organization_id, user_id, role)
select id, 'REPLACE_WITH_AUTH_USER_UUID'::uuid, 'owner' from org;
```

6. Restart `npm run dev`, then sign in at `/login`.

## Security and scope
- `/app` is authenticated server-side through Supabase Auth.
- Organization data is isolated through database Row Level Security.
- No service-role key is shipped to the browser.
- Shared client-demo links, CSV import, production scan jobs, and public client marketing pages are **not yet implemented**. This is the first infrastructure increment, not the full MVP.
- All external-business facts must retain provenance. Never mark a business verified based solely on AI inference.

## Project milestones
1. [x] Repository foundation, authorization structure, initial schema, dashboard shell.
2. [ ] Authenticated local run with independent Supabase project.
3. [ ] Verified government-data ingestion, review queue, deduplication, first 500+ researched companies.
4. [ ] Lead scoring and visit pipeline.
5. [ ] Three integrated customizable demo templates; secure client sharing.
6. [ ] Scheduled discovery, weekly website checks, monthly registration rechecks.
7. [ ] Refined futuristic HUD visual system and voice command affordances after design review.
