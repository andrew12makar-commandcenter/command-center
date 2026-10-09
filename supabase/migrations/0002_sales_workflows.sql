-- Command Center v0.2 - run ONCE, after 0001, in the separate business Supabase project.
-- Preserves existing businesses and user membership.
alter table public.businesses add column if not exists contact_name text;
alter table public.businesses add column if not exists contact_email text;
alter table public.businesses add column if not exists google_business_url text;
alter table public.businesses add column if not exists next_follow_up_on date;
alter table public.businesses add column if not exists last_contact_at timestamptz;
alter table public.businesses add column if not exists score_rationale text;
create index if not exists businesses_followup_idx on public.businesses(organization_id,next_follow_up_on);

create table if not exists public.business_activities (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 activity_type text not null check(activity_type in ('note','call','email','visit','meeting','proposal','status')),
 details text not null,
 occurred_at timestamptz not null default now()
);
create index if not exists business_activities_lookup on public.business_activities(organization_id,business_id,occurred_at desc);
alter table public.business_activities enable row level security;
create policy "Members view activity" on public.business_activities
for select to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid()))
 and exists(select 1 from public.businesses b where b.id=business_id and b.organization_id=organization_id)
);
create policy "Editors log activity" on public.business_activities
for insert to authenticated with check (
 actor_id=(select auth.uid())
 and organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor'))
 and exists(select 1 from public.businesses b where b.id=business_id and b.organization_id=organization_id)
);
grant select, insert on public.business_activities to authenticated;

create table if not exists public.lead_import_rows (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 submitted_by uuid references auth.users(id) on delete set null,
 batch_id uuid not null,
 row_number integer not null,
 name text,
 city text,
 category text,
 website_url text,
 phone text,
 source_url text,
 source_type text,
 raw_data jsonb not null default '{}'::jsonb,
 review_status text not null default 'pending' check(review_status in ('pending','imported','duplicate','skipped','invalid')),
 matched_business_id uuid references public.businesses(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(organization_id,batch_id,row_number)
);
create index if not exists lead_import_review_idx on public.lead_import_rows(organization_id,review_status,created_at desc);
alter table public.lead_import_rows enable row level security;
create policy "Members view staged leads" on public.lead_import_rows for select to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid()))
);
create policy "Editors stage leads" on public.lead_import_rows for insert to authenticated with check (
 submitted_by=(select auth.uid())
 and organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor'))
);
create policy "Editors review leads" on public.lead_import_rows for update to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor'))
) with check (
 organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor'))
);
grant select, insert, update on public.lead_import_rows to authenticated;

-- Source evidence must be manually reviewed before any business is marked verified.
create policy "Editors review sources" on public.business_sources for update to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor'))
 and exists(select 1 from public.businesses b where b.id=business_id and b.organization_id=organization_id)
) with check (
 organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor'))
 and exists(select 1 from public.businesses b where b.id=business_id and b.organization_id=organization_id)
);
grant update on public.business_sources to authenticated;

-- Organization boundaries for demo drafts were already enabled in 0001.
-- Publicly shareable, password-protected demo tokens are intentionally not created here;
-- the internal draft viewer must be reviewed first.
