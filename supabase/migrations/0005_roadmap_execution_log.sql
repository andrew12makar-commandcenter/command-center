-- Apply ONCE after migration 0004 in the business Command Center Supabase.
-- Extend the roadmap with explicit active/blocked statuses and an audit trail.
alter table public.project_roadmap_progress drop constraint if exists project_roadmap_progress_status_check;
alter table public.project_roadmap_progress add constraint project_roadmap_progress_status_check
 check (status in ('pending','in_progress','blocked','completed'));
create table if not exists public.project_roadmap_activity (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 step_id text not null,
 status text not null check(status in ('pending','in_progress','blocked','completed')),
 evidence_note text not null default '',
 changed_by uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default now()
);
create index if not exists roadmap_activity_recent_idx on public.project_roadmap_activity (organization_id,changed_at desc);
alter table public.project_roadmap_activity enable row level security;
create policy "Organization members see roadmap history" on public.project_roadmap_activity
 for select to authenticated using (organization_id in
  (select organization_id from public.organization_members where user_id=(select auth.uid())));
grant select on public.project_roadmap_activity to authenticated;
create or replace function public.record_command_center_roadmap_activity()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' or (new.status,new.evidence_note) is distinct from (old.status,old.evidence_note) then
  insert into public.project_roadmap_activity (organization_id,step_id,status,evidence_note,changed_by)
  values (new.organization_id,new.step_id,new.status,new.evidence_note,new.updated_by);
 end if;
 return new;
end;
$$;
revoke all on function public.record_command_center_roadmap_activity() from public,anon,authenticated;
drop trigger if exists roadmap_progress_changed on public.project_roadmap_progress;
create trigger roadmap_progress_changed after insert or update on public.project_roadmap_progress
 for each row execute function public.record_command_center_roadmap_activity();
