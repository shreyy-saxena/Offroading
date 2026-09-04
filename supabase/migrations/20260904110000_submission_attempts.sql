-- Ticket 17: sliding-window submission rate limiting (PRD 12.5).
--
-- A dedicated table rather than reusing `reports` — a rate-limited
-- attempt never becomes a report row at all, and this stays entirely
-- decoupled from report data (no risk of rate-limit bookkeeping ever
-- leaking through a reports query). `identifier` is generic (usually the
-- caller's IP) rather than named `ip_address`, so the app layer can widen
-- what it hashes into it later without a schema change.
create table submission_attempts (
  id bigint generated always as identity primary key,
  identifier text not null,
  created_at timestamptz not null default now()
);

-- The only query this table serves: "how many attempts for this
-- identifier since some cutoff" — composite index matches that shape.
create index submission_attempts_identifier_created_idx
  on submission_attempts (identifier, created_at);

alter table submission_attempts enable row level security;
-- Deliberately no policies, same access model as reports/district_mapping
-- (ticket 02): only ever read/written via the service-role client, from
-- src/lib/reports/rate-limit.ts.
