-- Ticket 02: reports + district_mapping schema, RLS boundary.
--
-- Access model (see ticket 02 Comments for the full rationale, including
-- why `reports` has no INSERT policy for anon either):
--   * `reports` has NO policies for anon/authenticated at all. Public
--     access goes through the `public_reports` view below instead, which
--     exposes only the feed-safe columns (FR8). Citizens never talk to
--     Supabase directly (no direct browser writes in this architecture —
--     the spec's testing section treats the Next.js route handler as the
--     access boundary), so report submission is done server-side via the
--     service-role client, same as everything else below.
--   * `district_mapping` has no policies at all for anon/authenticated —
--     it is only ever read or written via the service-role client
--     (src/lib/supabase/server.ts: createServiceRoleClient), from admin
--     route handlers that independently re-check the caller's admin role
--     (app_metadata.role = 'admin') on every request (FR7). This keeps
--     admin authorization in one place (app code) instead of duplicating
--     it as SQL policies.

create table reports (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null,
  latitude double precision not null,
  longitude double precision not null,
  locality text not null,
  -- Not a DB foreign key: the canonical district list is the static,
  -- hand-maintained src/lib/data/districts.ts (PRD 12.2), not a table.
  -- Validated against that list in application code.
  district text not null,
  reporter_type text not null check (reporter_type in ('passerby', 'resident')),
  reporter_name text,
  reporter_mobile text,
  reporter_email text,
  email_delivery_status text not null default 'not_applicable'
    check (email_delivery_status in ('not_applicable', 'sent', 'failed', 'queued')),
  email_error_detail text,
  created_at timestamptz not null default now()
);

-- Feed query (recency-ordered) and queued-email-trigger lookup (by district)
-- are the two access patterns the spec describes.
create index reports_created_at_idx on reports (created_at desc);
create index reports_district_idx on reports (district);

alter table reports enable row level security;
-- Deliberately no policies: report submission is done server-side via the
-- service-role client (see header comment above).

-- Feed-safe subset only (FR8: never reporter contact info or delivery
-- diagnostics). Owned by the migration role, so it reads through RLS on
-- the base table rather than being subject to it — the standard Supabase
-- pattern for a public view over a locked-down table.
create view public_reports as
  select id, photo_url, latitude, longitude, locality, district, reporter_type, created_at
  from reports;

grant select on public_reports to anon, authenticated;

create table district_mapping (
  district text primary key,
  authority_email text not null
);

alter table district_mapping enable row level security;
-- Deliberately no policies: all access is via the service-role client
-- from admin-checked route handlers (see header comment above).
