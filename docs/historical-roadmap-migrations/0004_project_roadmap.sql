-- HISTORICAL SOURCE SNAPSHOT: feature/nextjs-foundation
-- ARCHIVE ONLY. DO NOT APPLY. Conflicts with current migration numbering.
-- Original source blob: 2833c4e4d65e9bcc980fe21417c66f0f092dadf4

-- Command Center roadmap status. Apply ONCE after 0003, only to the existing
-- for-profit Supabase project. No business, demo, membership or auth rows change.
create table if not exists public.project_roadmap_progress (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 step_id text not null check(length(step_id) between 3 and 100),
 status text not null check(status in ('completed','pending')),
 evidence_note text not null default '' check(length(evidence_note)<=1200),
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(),
 primary key(organization_id,step_id)
);
create index if not exists project_roadmap_updated_idx on public.project_roadmap_progress(organization_id,updated_at desc);
alter table public.project_roadmap_progress enable row level security;

create policy "Roadmap visible to organization members"
on public.project_roadmap_progress for select to authenticated
using (organization_id in (
 select organization_id from public.organization_members where user_id=(select auth.uid())
));

create policy "Roadmap editable by organization editors"
on public.project_roadmap_progress for insert to authenticated
with check (
 updated_by=(select auth.uid()) and organization_id in (
  select organization_id from public.organization_members
  where user_id=(select auth.uid()) and role in ('owner','admin','editor')
 )
);

create policy "Roadmap changes restricted to organization editors"
on public.project_roadmap_progress for update to authenticated
using (organization_id in (
 select organization_id from public.organization_members
 where user_id=(select auth.uid()) and role in ('owner','admin','editor')
)) with check (
 updated_by=(select auth.uid()) and organization_id in (
  select organization_id from public.organization_members
  where user_id=(select auth.uid()) and role in ('owner','admin','editor')
 )
);

grant select,insert,update on public.project_roadmap_progress to authenticated;
