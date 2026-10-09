-- Command Center v0.3. Apply ONCE to the existing for-profit Supabase project, after 0002.
-- Feedback is evidence for selecting variants; it does not retrain a language model.
alter table public.demo_sites add column if not exists revision_no integer not null default 1
  check(revision_no > 0);
alter table public.demo_sites add column if not exists visual_variant text not null default 'editorial'
  check(visual_variant in ('editorial','bold'));

create table if not exists public.demo_feedback (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 demo_id uuid not null references public.demo_sites(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 revision_no integer not null check(revision_no > 0),
 template text not null check(template in ('landscaping','medical','universal')),
 visual_variant text not null check(visual_variant in ('editorial','bold')),
 rating integer not null check(rating between 1 and 5),
 issue_tags text[] not null default '{}',
 notes text not null default '',
 created_at timestamptz not null default now(),
 unique(demo_id, user_id, revision_no)
);
create index if not exists demo_feedback_variant_idx on public.demo_feedback
 (organization_id, template, visual_variant, created_at desc);

create table if not exists public.demo_revisions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 demo_id uuid not null references public.demo_sites(id) on delete cascade,
 revision_no integer not null check(revision_no > 0),
 content jsonb not null,
 saved_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(demo_id,revision_no)
);
create index if not exists demo_revisions_demo_idx on public.demo_revisions(demo_id, revision_no desc);

alter table public.demo_feedback enable row level security;
alter table public.demo_revisions enable row level security;

create policy "Members read demo feedback" on public.demo_feedback for select to authenticated
 using (organization_id in
   (select organization_id from public.organization_members where user_id=(select auth.uid()))
   and exists(select 1 from public.demo_sites d where d.id=demo_id and d.organization_id=organization_id));
create policy "Editors add demo feedback" on public.demo_feedback for insert to authenticated
 with check(user_id=(select auth.uid())
   and organization_id in
   (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor'))
   and exists(select 1 from public.demo_sites d where d.id=demo_id and d.organization_id=organization_id));
create policy "Editors revise their feedback" on public.demo_feedback for update to authenticated
 using(user_id=(select auth.uid()) and organization_id in
   (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor')))
 with check(user_id=(select auth.uid()) and organization_id in
   (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor')));

create policy "Members read demo revisions" on public.demo_revisions for select to authenticated
 using(organization_id in
   (select organization_id from public.organization_members where user_id=(select auth.uid()))
   and exists(select 1 from public.demo_sites d where d.id=demo_id and d.organization_id=organization_id));
create policy "Editors insert demo revisions" on public.demo_revisions for insert to authenticated
 with check(saved_by=(select auth.uid()) and organization_id in
   (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor'))
   and exists(select 1 from public.demo_sites d where d.id=demo_id and d.organization_id=organization_id));

grant select, insert, update on public.demo_feedback to authenticated;
grant select, insert on public.demo_revisions to authenticated;

-- Atomic copy-on-write. Invoker access is still subject to RLS and explicit editor membership.
create or replace function public.save_demo_revision(
 p_demo_id uuid, p_expected_revision integer, p_content jsonb
) returns integer language plpgsql security invoker set search_path=public as $$
declare d public.demo_sites%rowtype;
declare next_revision integer;
begin
 if auth.uid() is null or jsonb_typeof(p_content)<>'object' then
   raise exception 'Invalid session or demo content';
 end if;
 select * into d from public.demo_sites where id=p_demo_id for update;
 if not found then raise exception 'Demo not found'; end if;
 if not exists(select 1 from public.organization_members m
   where m.user_id=auth.uid() and m.organization_id=d.organization_id
   and m.role in ('owner','admin','editor')) then
   raise exception 'Editor access required';
 end if;
 if d.revision_no<>p_expected_revision then
   raise exception 'Demo changed since it was opened; reload before saving';
 end if;
 insert into public.demo_revisions(organization_id,demo_id,revision_no,content,saved_by)
 values(d.organization_id,d.id,d.revision_no,d.draft_content,auth.uid())
 on conflict(demo_id,revision_no) do nothing;
 next_revision:=d.revision_no+1;
 update public.demo_sites set draft_content=p_content, revision_no=next_revision
   where id=d.id and organization_id=d.organization_id;
 insert into public.demo_revisions(organization_id,demo_id,revision_no,content,saved_by)
 values(d.organization_id,d.id,next_revision,p_content,auth.uid());
 return next_revision;
end $$;
revoke all on function public.save_demo_revision(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_demo_revision(uuid,integer,jsonb) to authenticated;
