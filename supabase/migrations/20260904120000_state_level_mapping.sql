-- State-level authority-email mapping, replacing the district-level
-- mapping from 20260903120000/20260904100000.
--
-- Rationale: collecting a distinct authority email per district turned
-- out not to be logistically possible, so the fallback is one or more
-- authority addresses per state — every district within that state now
-- routes complaint emails to its state's address(es). `state_mapping`
-- keeps the same access model as the `district_mapping` table it
-- replaces: no anon/authenticated policies at all, reachable only via
-- the service-role client from admin-checked route handlers (see
-- 20260903120000's header comment for the full rationale).

drop function if exists replace_district_mapping(jsonb);
drop table if exists district_mapping;

create table state_mapping (
  state text primary key,
  authority_emails text[] not null
);

alter table state_mapping enable row level security;
-- Deliberately no policies: all access is via the service-role client
-- from admin-checked route handlers, same as the table it replaces.

-- Same atomic delete+insert shape as the old replace_district_mapping
-- (see 20260904100000's header comment for why this has to be a single
-- Postgres function rather than two plain supabase-js calls, and why the
-- `where true` on the delete is load-bearing under pg-safeupdate).
create or replace function replace_state_mapping(rows jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from state_mapping where true;

  insert into state_mapping (state, authority_emails)
  select state, authority_emails
  from jsonb_to_recordset(rows) as x(state text, authority_emails text[]);
end;
$$;

revoke all on function replace_state_mapping(jsonb) from public, anon, authenticated;
grant execute on function replace_state_mapping(jsonb) to service_role;
