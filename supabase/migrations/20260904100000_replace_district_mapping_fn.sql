-- Ticket 15: atomic delete+insert for a full CSV-driven mapping replace.
--
-- supabase-js has no client-side multi-statement transaction API, so the
-- "delete-all + insert in one transaction" requirement (ticket 15 scope,
-- PRD Section 6 Step 2) is implemented as a single Postgres function
-- instead — one function call is one implicit transaction, so a failure
-- partway through (e.g. a constraint violation) rolls back the delete
-- too, and no caller ever observes an empty table mid-upload.
--
-- Access model matches ticket 02's for district_mapping itself: no anon/
-- authenticated access at all. A Postgres function's EXECUTE privilege
-- defaults to PUBLIC (unlike a table, which defaults to no access), so
-- without the explicit revoke below this would be silently callable by
-- anon/authenticated straight through PostgREST — bypassing the
-- app-side admin re-check ticket 14 relies on entirely. Only
-- service_role may call it; the admin route handler (ticket 15) is what
-- actually enforces the admin check before ever reaching this function.
create or replace function replace_district_mapping(rows jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- `where true` is load-bearing, not decorative: Supabase installs the
  -- pg-safeupdate extension by default, which rejects a bare DELETE/UPDATE
  -- with no WHERE clause even inside a SECURITY INVOKER function running
  -- as service_role — discovered live when the bare `delete from
  -- district_mapping;` below failed with "DELETE requires a WHERE clause".
  delete from district_mapping where true;

  insert into district_mapping (district, authority_email)
  select district, authority_email
  from jsonb_to_recordset(rows) as x(district text, authority_email text);
end;
$$;

revoke all on function replace_district_mapping(jsonb) from public, anon, authenticated;
grant execute on function replace_district_mapping(jsonb) to service_role;
