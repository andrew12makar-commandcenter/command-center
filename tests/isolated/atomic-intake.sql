-- ISOLATED TEST FIXTURE ONLY. NOT A PRODUCTION MIGRATION.
-- Used by CI on a disposable local Supabase database. The tested SQL must be
-- separately reviewed and explicitly approved before a production migration.
--
-- SECURITY INVOKER means the caller's JWT, table grants, and RLS apply.
-- A single PostgreSQL function call is a single transaction. Row locks
-- serialize imports for the same staged row and the same CRM business.
create or replace function public.commit_staged_import_atomic(
 p_row_id uuid, p_organization_id uuid, p_business jsonb,
 p_qualification jsonb, p_sources jsonb
)
returns table (business_id uuid, resumed boolean)
language plpgsql security invoker set search_path = pg_catalog, public
as $$
declare
 v_row public.lead_import_rows%rowtype;
 v_business public.businesses%rowtype;
 v_id uuid;
 v_existing boolean;
 v_source jsonb;
 v_url text;
 v_type text;
 v_source_id uuid;
 v_seen integer := 0;
begin
 if (select auth.uid()) is null or not exists (
   select 1 from public.organization_members m
   where m.organization_id=p_organization_id and m.user_id=(select auth.uid())
     and m.role in ('owner','admin','editor')
 ) then
   raise exception 'Authenticated organization editor required' using errcode='42501';
 end if;
 if p_row_id is null or p_organization_id is null
   or jsonb_typeof(p_business) is distinct from 'object'
   or jsonb_typeof(p_qualification) is distinct from 'object'
   or jsonb_typeof(p_sources) is distinct from 'array'
   or jsonb_array_length(p_sources)>8 then
   raise exception 'Invalid atomic import payload';
 end if;
 if p_business ? 'organization_id'
   and p_business->>'organization_id' is distinct from p_organization_id::text then
   raise exception 'Organization mismatch in business payload';
 end if;
 -- Both RLS and the explicit organization predicate must permit this row.
 select * into v_row from public.lead_import_rows s
 where s.id=p_row_id and s.organization_id=p_organization_id
 for update;
 if not found then
   raise exception 'Staging row unavailable to this organization' using errcode='42501';
 end if;
 if v_row.review_status<>'pending' then
   raise exception 'Staged row is not pending';
 end if;
 if v_row.triage_status='disqualified' then
   raise exception 'Disqualified lead cannot be imported';
 end if;
 if v_row.name is null or char_length(trim(v_row.name))<2
    or p_business->>'name' is distinct from v_row.name then
   raise exception 'Staged business name mismatch';
 end if;
 v_id:=coalesce(v_row.matched_business_id,v_row.id);
 -- Lock the business as well, to serialize imports from distinct staging rows
 -- that were explicitly linked to the same business.
 select * into v_business from public.businesses b
 where b.id=v_id and b.organization_id=p_organization_id
 for update;
 v_existing:=found;
 if v_existing then
   if regexp_replace(lower(v_business.name),'[^a-z0-9]','','g')
      is distinct from regexp_replace(lower(v_row.name),'[^a-z0-9]','','g') then
     raise exception 'Staged row points to a different business';
   end if;
 else
   if v_row.matched_business_id is not null then
     raise exception 'Staged recovery link has no matching business';
   end if;
   -- Whitelist every imported field. Keep defaults (state, operational
   -- status, pipeline, dates, priority score) untouched.
   insert into public.businesses(
     id,organization_id,name,city,category,phone,website_url,
     verification_status,street_address,postal_code,service_area,
     contact_email,contact_name,google_business_url,
     campaign_id,primary_opportunity,evidence_confidence,
     next_action,qualification_rationale
   ) values (
     v_id,p_organization_id,v_row.name,p_business->>'city',
     p_business->>'category',p_business->>'phone',p_business->>'website_url',
     coalesce(p_business->>'verification_status','unverified'),
     p_business->>'street_address',p_business->>'postal_code',p_business->>'service_area',
     p_business->>'contact_email',p_business->>'contact_name',
     p_business->>'google_business_url',
     nullif(p_qualification->>'campaign_id','')::uuid,
     p_qualification->>'primary_opportunity',p_qualification->>'evidence_confidence',
     p_qualification->>'next_action',p_qualification->>'qualification_rationale'
   );
 end if;
 -- If any later step fails, this link AND the new business roll back.
 update public.lead_import_rows
 set matched_business_id=v_id where id=p_row_id
   and organization_id=p_organization_id and review_status='pending'
   and (matched_business_id is null or matched_business_id=v_id);
 if not found then raise exception 'Staging link changed while importing'; end if;

 for v_source in select value from jsonb_array_elements(p_sources)
 loop
   v_seen:=v_seen+1;
   v_type:=v_source->>'source_type';
   v_url:=v_source->>'source_url';
   if v_seen>8 or v_type is null or char_length(v_type)>80
     or v_url is null or left(v_url,4)<>'http'
     or v_source->>'confidence' is distinct from 'pending' then
       raise exception 'Invalid source evidence; rolling back entire import';
   end if;
   v_source_id:=(v_source->>'id')::uuid;
   if v_source_id is null then raise exception 'Source ID required'; end if;
   if not exists (
     select 1 from public.business_sources es where es.organization_id=p_organization_id
       and es.business_id=v_id and es.source_type=v_type
       and es.source_url=v_url
   ) then
      insert into public.business_sources(
        id,organization_id,business_id,source_url,source_type,
        raw_name,raw_address,registration_number,confidence
      ) values (
        v_source_id,p_organization_id,v_id,v_url,v_type,
        v_source->>'raw_name',v_source->>'raw_address',
        v_source->>'registration_number','pending'
      );
   end if;
 end loop;
 update public.lead_import_rows set review_status='imported'
 where id=p_row_id and organization_id=p_organization_id
   and review_status='pending' and matched_business_id=v_id;
 if not found then raise exception 'Staged completion failed'; end if;

 return query select v_id, v_existing;
end;
$$;
revoke all on function public.commit_staged_import_atomic(uuid,uuid,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.commit_staged_import_atomic(uuid,uuid,jsonb,jsonb,jsonb) to authenticated;

-- TEST-ONLY fault injector. Simulates an error at the very LAST DB write,
-- after both CRM and evidence inserts have executed. The RPC must roll them
-- all back in a single database transaction. Never ship this trigger.
create function public.isolated_abort_import_completion()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public
as $$
begin
 if new.review_status='imported' and new.name like 'Atomic final failure %' then
   raise exception 'Isolated final staging update failure';
 end if;
 return new;
end;
$$;
create trigger isolated_abort_import_completion
before update of review_status on public.lead_import_rows
for each row execute function public.isolated_abort_import_completion();
