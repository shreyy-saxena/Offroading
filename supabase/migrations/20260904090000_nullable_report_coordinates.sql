-- Ticket 08: a report reached via ticket 06's manual-locality path (GPS
-- denied/unavailable, or a citizen typing their own locality) has no
-- device GPS reading at all — only a locality/district string. The
-- original schema (ticket 02) required lat/lng on every report, which
-- can't be satisfied honestly for that path. Rather than fabricate a
-- coordinate, make both columns nullable.
alter table reports
  alter column latitude drop not null,
  alter column longitude drop not null;
