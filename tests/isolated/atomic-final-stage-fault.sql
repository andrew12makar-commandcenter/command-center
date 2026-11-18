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
