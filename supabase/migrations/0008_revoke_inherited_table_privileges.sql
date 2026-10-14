-- Command Center security hardening. PREPARED, NOT APPLIED. Apply only with explicit owner approval,
-- after 0007_prospect_discovery.sql. Least-privilege fix for privileges inherited from the
-- project's default ACLs. It revokes ONLY TRUNCATE, TRIGGER and REFERENCES from anon and
-- authenticated. It does not touch SELECT/INSERT/UPDATE/DELETE, sequences, functions, RLS
-- policies, service_role, or any data.
--
-- Findings (inspected 2026-10-14, project lxdnoxflwqmsvnoforgl):
--  * Every table in schema public is owned by postgres.
--  * pg_default_acl for role postgres in schema public, tables: anon=Dxtm, authenticated=Dxtm,
--    service_role=Dxtm (D=TRUNCATE, x=REFERENCES, t=TRIGGER, m=MAINTAIN). Every table created by
--    postgres therefore grants TRUNCATE/REFERENCES/TRIGGER (and MAINTAIN) to anon and authenticated
--    on top of the explicit grants in 0001-0007.
--  * pg_default_acl for role supabase_admin in schema public grants arwdDxtm to anon/authenticated.
--    No public table is currently owned by supabase_admin. postgres is not a member of
--    supabase_admin, so it cannot alter that role's defaults; the guarded block below does so only
--    if the executing role is permitted, otherwise it reports a NOTICE.
--  * Postgres sequences/functions defaults in public grant nothing to anon/authenticated.
--  * MAINTAIN (PG17) is also inherited. It is intentionally NOT revoked here (out of the approved
--    scope); see the optional line at the end.

-- 1. Existing tables in public (all owned by postgres).
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- 2. Future tables created by postgres in public.
alter default privileges for role postgres in schema public
 revoke truncate, trigger, references on tables from anon, authenticated;

-- 3. Future tables created by supabase_admin in public (only if this session may act for it).
do $$
begin
 if pg_has_role(current_user,'supabase_admin','MEMBER') then
  execute 'alter default privileges for role supabase_admin in schema public revoke truncate, trigger, references on tables from anon, authenticated';
 else
  raise notice 'Skipped supabase_admin default privileges: % is not a member of supabase_admin. No public tables are owned by supabase_admin today.', current_user;
 end if;
end $$;

-- 4. Verification: abort the whole migration (transaction rollback) if anything remains.
do $$
declare leftover text;
begin
 select string_agg(c.relname||':'||r.rolname||':'||p.priv, ', ') into leftover
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join (values ('anon'),('authenticated')) r(rolname)
 cross join (values ('TRUNCATE'),('TRIGGER'),('REFERENCES')) p(priv)
 where n.nspname='public' and c.relkind in ('r','p','v','m','f')
   and has_table_privilege(r.rolname,c.oid,p.priv);
 if leftover is not null then raise exception 'Privileges still present: %',leftover; end if;
 -- Application access that must remain (spot checks matching 0001-0007 grants).
 if not has_table_privilege('authenticated','public.businesses','SELECT,INSERT,UPDATE')
  or not has_table_privilege('authenticated','public.lead_import_rows','SELECT,INSERT,UPDATE')
  or not has_table_privilege('authenticated','public.design_preference_rules','DELETE')
  or not has_table_privilege('authenticated','public.organizations','SELECT') then
  raise exception 'Required application privileges missing after revoke';
 end if;
 if exists (select 1 from pg_default_acl d join pg_namespace n on n.oid=d.defaclnamespace
   where n.nspname='public' and d.defaclobjtype='r' and pg_get_userbyid(d.defaclrole)='postgres'
   and exists (select 1 from aclexplode(d.defaclacl) a where a.grantee in ('anon'::regrole,'authenticated'::regrole)
     and a.privilege_type in ('TRUNCATE','TRIGGER','REFERENCES'))) then
  raise exception 'postgres default privileges still grant TRUNCATE/TRIGGER/REFERENCES';
 end if;
end $$;

-- Manual verification queries (read-only) to run after applying:
--   select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type)
--   from information_schema.role_table_grants
--   where table_schema='public' and grantee in ('anon','authenticated') group by 1,2 order by 1,2;
--   select pg_get_userbyid(defaclrole), defaclobjtype, defaclacl from pg_default_acl d
--   join pg_namespace n on n.oid=d.defaclnamespace where n.nspname='public';

-- ROLLBACK (do not run unless restoring the previous, less secure state is required):
--   grant truncate, trigger, references on all tables in schema public to anon, authenticated;
--   alter default privileges for role postgres in schema public
--    grant truncate, trigger, references on tables to anon, authenticated;

-- OPTIONAL, NOT INCLUDED (requires separate approval): also revoke PG17 MAINTAIN.
--   revoke maintain on all tables in schema public from anon, authenticated;
--   alter default privileges for role postgres in schema public revoke maintain on tables from anon, authenticated;
