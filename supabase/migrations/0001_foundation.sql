-- Command Center v0.1: organization-scoped CRM. Execute in a NEW Supabase project only.
create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','admin','editor','viewer')),
  primary key (organization_id,user_id)
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  street_address text,
  city text,
  state text not null default 'MA',
  postal_code text,
  service_area text,
  website_url text,
  phone text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified')),
  operational_status text not null default 'unknown' check (operational_status in ('unknown','operating','opening','closed')),
  pipeline_status text not null default 'not_contacted' check (pipeline_status in ('not_contacted','visited','contacted','proposal_sent','won','lost')),
  priority_score integer check (priority_score between 0 and 100),
  notes text,
  first_found_at timestamptz not null default now(),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_type text not null,
  source_url text,
  agency text,
  registration_number text,
  raw_name text,
  raw_address text,
  confidence text not null default 'pending' check(confidence in ('pending','matched','rejected')),
  verified_at timestamptz,
  recorded_at timestamptz not null default now()
);

create table public.website_assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  website_url text,
  status text not null default 'inconclusive' check(status in ('verified_gaps','no_gaps','inconclusive')),
  findings jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  assessed_at timestamptz not null default now()
);

create table public.demo_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  template text not null check(template in ('landscaping','medical','universal')),
  draft_content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check(status in ('draft','review','shared','archived')),
  created_at timestamptz not null default now()
);

create index businesses_org_score_idx on public.businesses(organization_id, priority_score desc);
create index businesses_org_location_idx on public.businesses(organization_id, city);
create index business_sources_business_idx on public.business_sources(business_id);
create index website_assessments_business_idx on public.website_assessments(business_id);
create index demo_sites_business_idx on public.demo_sites(business_id);

-- All CRM tables require an authenticated member of the same organization.
-- Membership administration is intentionally not exposed through the client in v0.1.
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.businesses enable row level security;
alter table public.business_sources enable row level security;
alter table public.website_assessments enable row level security;
alter table public.demo_sites enable row level security;

-- Nonrecursive membership checking via user_id; members can read their own row only.
create policy "Members see their own membership" on public.organization_members
for select to authenticated using (user_id = (select auth.uid()));

create policy "Members see their organizations" on public.organizations
for select to authenticated using (
  id in (select organization_id from public.organization_members where user_id = (select auth.uid()))
);

-- Owners, admins and editors can write prospect data; all org members can read.
create policy "Members can view businesses" on public.businesses
for select to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()))
);
create policy "Editors can insert businesses" on public.businesses
for insert to authenticated with check (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and role in ('owner','admin','editor'))
);
create policy "Editors can update businesses" on public.businesses
for update to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and role in ('owner','admin','editor'))
) with check (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and role in ('owner','admin','editor'))
);
-- Related records are protected by membership AND association with a business in the same org.
create policy "Members can view sources" on public.business_sources
for select to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()))
 and exists (select 1 from public.businesses b where b.id = business_id and b.organization_id = organization_id)
);
create policy "Editors can insert sources" on public.business_sources
for insert to authenticated with check (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and role in ('owner','admin','editor'))
 and exists (select 1 from public.businesses b where b.id = business_id and b.organization_id = organization_id)
);
create policy "Members can view assessments" on public.website_assessments
for select to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()))
 and exists (select 1 from public.businesses b where b.id = business_id and b.organization_id = organization_id)
);
create policy "Editors can insert assessments" on public.website_assessments
for insert to authenticated with check (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and role in ('owner','admin','editor'))
 and exists (select 1 from public.businesses b where b.id = business_id and b.organization_id = organization_id)
);
create policy "Members can view demos" on public.demo_sites
for select to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()))
 and exists (select 1 from public.businesses b where b.id = business_id and b.organization_id = organization_id)
);
create policy "Editors can insert demos" on public.demo_sites
for insert to authenticated with check (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and role in ('owner','admin','editor'))
 and exists (select 1 from public.businesses b where b.id = business_id and b.organization_id = organization_id)
);
create policy "Editors can update demos" on public.demo_sites
for update to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and role in ('owner','admin','editor'))
) with check (
 organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and role in ('owner','admin','editor'))
 and exists (select 1 from public.businesses b where b.id = business_id and b.organization_id = organization_id)
);

-- Supabase project setting "Automatically expose new tables" is OFF.
-- Grant only the Data API privileges that the current app actually needs.
-- These SQL grants do not bypass any of the row-level policies above.
grant usage on schema public to authenticated;
grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, update on public.businesses to authenticated;
grant select, insert on public.business_sources to authenticated;
grant select, insert on public.website_assessments to authenticated;
grant select, insert, update on public.demo_sites to authenticated;
