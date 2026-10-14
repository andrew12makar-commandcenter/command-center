-- Command Center: Prospect Discovery MVP (campaigns + deterministic qualification).
-- Apply ONCE after 0006_roadmap_execution_log.sql in the business Command Center Supabase.
-- Forward-only and additive: no existing rows, policies or columns are rewritten.
-- Opportunity strength and contact readiness are NOT stored; they are derived in
-- lib/prospect-qualification.ts from recorded evidence. Only operator decisions
-- (triage status, manual overrides) and the import-time snapshot are stored.

create table if not exists public.discovery_campaigns (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check (char_length(name) between 2 and 120),
 target_area text not null default '' check (char_length(target_area) <= 120),
 target_industry text not null default '' check (char_length(target_industry) <= 120),
 target_service text not null check (target_service in ('gbp','website_design','geolocation_pages','local_seo','general_research')),
 discovery_source text not null check (discovery_source in ('osm','boston-certified','boston-food','csv_import','manual')),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists discovery_campaigns_org_idx on public.discovery_campaigns(organization_id, created_at desc);

alter table public.discovery_campaigns enable row level security;
create policy "Members view discovery campaigns" on public.discovery_campaigns
for select to authenticated using (
 organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid()))
);
create policy "Editors create discovery campaigns" on public.discovery_campaigns
for insert to authenticated with check (
 created_by=(select auth.uid())
 and organization_id in (select organization_id from public.organization_members where user_id=(select auth.uid()) and role in ('owner','admin','editor'))
);
grant select, insert on public.discovery_campaigns to authenticated;

-- Staged candidates: campaign attribution, triage decision and optional manual overrides.
-- 'imported' research status is derived from the existing review_status column.
alter table public.lead_import_rows add column if not exists campaign_id uuid references public.discovery_campaigns(id) on delete set null;
alter table public.lead_import_rows add column if not exists triage_status text not null default 'review_needed';
alter table public.lead_import_rows add column if not exists primary_opportunity_override text;
alter table public.lead_import_rows add column if not exists evidence_confidence_override text;
alter table public.lead_import_rows add column if not exists next_action_override text;
alter table public.lead_import_rows add column if not exists disqualification_reason text;
alter table public.lead_import_rows add constraint lead_import_rows_triage_status_check
 check (triage_status in ('review_needed','shortlisted','held','disqualified'));
alter table public.lead_import_rows add constraint lead_import_rows_primary_opportunity_check
 check (primary_opportunity_override is null or primary_opportunity_override in ('gbp','website_design','geolocation_pages','local_seo','no_clear_opportunity','unknown'));
alter table public.lead_import_rows add constraint lead_import_rows_evidence_confidence_check
 check (evidence_confidence_override is null or evidence_confidence_override in ('high','medium','low','unknown'));
alter table public.lead_import_rows add constraint lead_import_rows_next_action_check
 check (next_action_override is null or next_action_override in ('verify_business','find_official_website','confirm_gbp','inspect_website','inspect_location_pages','find_decision_maker','prepare_opportunity_brief','generate_website_demo','hold','disqualify','none'));
alter table public.lead_import_rows add constraint lead_import_rows_disqualification_reason_check
 check (disqualification_reason is null or char_length(disqualification_reason) between 8 and 500);
create index if not exists lead_import_campaign_idx on public.lead_import_rows(organization_id, campaign_id);

-- CRM: the qualification snapshot carried over at import. Never touches priority_score.
alter table public.businesses add column if not exists campaign_id uuid references public.discovery_campaigns(id) on delete set null;
alter table public.businesses add column if not exists primary_opportunity text;
alter table public.businesses add column if not exists evidence_confidence text;
alter table public.businesses add column if not exists next_action text;
alter table public.businesses add column if not exists qualification_rationale text;
alter table public.businesses add constraint businesses_primary_opportunity_check
 check (primary_opportunity is null or primary_opportunity in ('gbp','website_design','geolocation_pages','local_seo','no_clear_opportunity','unknown'));
alter table public.businesses add constraint businesses_evidence_confidence_check
 check (evidence_confidence is null or evidence_confidence in ('high','medium','low','unknown'));
alter table public.businesses add constraint businesses_next_action_check
 check (next_action is null or next_action in ('verify_business','find_official_website','confirm_gbp','inspect_website','inspect_location_pages','find_decision_maker','prepare_opportunity_brief','generate_website_demo','hold','disqualify','none'));
alter table public.businesses add constraint businesses_qualification_rationale_check
 check (qualification_rationale is null or char_length(qualification_rationale) <= 1200);
create index if not exists businesses_org_campaign_idx on public.businesses(organization_id, campaign_id);

-- Campaign links must stay inside the same organization (RLS alone cannot check a foreign row's org).
create or replace function public.enforce_campaign_organization()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.campaign_id is not null and not exists (
  select 1 from public.discovery_campaigns c where c.id=new.campaign_id and c.organization_id=new.organization_id
 ) then
  raise exception 'Discovery campaign belongs to a different organization';
 end if;
 return new;
end $$;
revoke all on function public.enforce_campaign_organization() from public,anon;
drop trigger if exists lead_import_rows_campaign_org on public.lead_import_rows;
create trigger lead_import_rows_campaign_org before insert or update of campaign_id on public.lead_import_rows
 for each row execute function public.enforce_campaign_organization();
drop trigger if exists businesses_campaign_org on public.businesses;
create trigger businesses_campaign_org before insert or update of campaign_id on public.businesses
 for each row execute function public.enforce_campaign_organization();
