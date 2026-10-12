-- Command Center v0.5. Persistent, scoped generator knowledge and evaluation evidence.
-- Apply after 0003. These records store explicit operator rules and measured results;
-- they do not claim to retrain model weights.
create table if not exists public.design_preference_rules (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 scope text not null check(scope in ('global','vertical','project')),
 scope_key text not null,
 rule_kind text not null check(rule_kind in ('prefer','avoid','require')),
 instruction text not null check(char_length(instruction) between 3 and 500),
 evidence_demo_id uuid references public.demo_sites(id) on delete set null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists design_preference_rules_lookup_idx on public.design_preference_rules
 (organization_id,user_id,scope,scope_key,active,updated_at desc);

create table if not exists public.generator_evaluations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 demo_id uuid not null references public.demo_sites(id) on delete cascade,
 revision_no integer not null check(revision_no > 0),
 evaluation_kind text not null check(evaluation_kind in ('preflight','visual','functional','lighthouse','content')),
 score numeric check(score between 0 and 100),
 passed boolean not null,
 evidence jsonb not null default '{}'::jsonb,
 evaluated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(demo_id,revision_no,evaluation_kind)
);
create index if not exists generator_evaluations_demo_idx on public.generator_evaluations
 (organization_id,demo_id,revision_no desc);

alter table public.design_preference_rules enable row level security;
alter table public.generator_evaluations enable row level security;

create policy "Members read design rules" on public.design_preference_rules for select to authenticated
 using(organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid())));
create policy "Editors manage own design rules" on public.design_preference_rules for all to authenticated
 using(user_id=(select auth.uid()) and organization_id in
  (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor')))
 with check(user_id=(select auth.uid()) and organization_id in
  (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor')));
create policy "Members read generator evaluations" on public.generator_evaluations for select to authenticated
 using(organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid())));
create policy "Editors add generator evaluations" on public.generator_evaluations for insert to authenticated
 with check(organization_id in
  (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor')));

grant select,insert,update,delete on public.design_preference_rules to authenticated;
grant select,insert,update on public.generator_evaluations to authenticated;
