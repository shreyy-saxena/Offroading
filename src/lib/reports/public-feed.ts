import { cache } from "react";
import { createAnonClient } from "@/lib/supabase/server";
import type { ReporterType } from "./submit-report";

export type PublicReport = {
  id: string;
  photoUrl: string;
  latitude: number | null;
  longitude: number | null;
  locality: string;
  district: string;
  reporterType: ReporterType;
  createdAt: string;
};

// Explicit list rather than "*": defense-in-depth alongside the DB view
// itself (ticket 02's `public_reports`) — even if a column were ever
// added to the view by mistake, this mapping step still can't leak it,
// since the returned object literal only ever has these keys. FR8 / PRD
// Section 7: reporter contact fields and email delivery diagnostics are
// never exposed here — not because the UI omits them, but because
// they're structurally unreachable at both the DB and this boundary.
const PUBLIC_FEED_COLUMNS = "id, photo_url, latitude, longitude, locality, district, reporter_type, created_at";

type PublicReportRow = {
  id: string;
  photo_url: string;
  latitude: number | null;
  longitude: number | null;
  locality: string;
  district: string;
  reporter_type: ReporterType;
  created_at: string;
};

function mapRow(row: PublicReportRow): PublicReport {
  return {
    id: row.id,
    photoUrl: row.photo_url,
    latitude: row.latitude,
    longitude: row.longitude,
    locality: row.locality,
    district: row.district,
    reporterType: row.reporter_type,
    createdAt: row.created_at,
  };
}

export async function listPublicReports(): Promise<PublicReport[]> {
  // The anon client — this is exactly the public/unauthenticated read
  // `public_reports` was designed for, and this page never needs to
  // know who (if anyone) is asking.
  const db = createAnonClient();
  const { data, error } = await db
    .from("public_reports")
    .select(PUBLIC_FEED_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ticket 12: a malformed id is treated the same as an unknown one (both
// resolve to null → the page's notFound()) rather than letting an
// invalid-UUID string reach Postgres as a raw query error.
export const getPublicReportById = cache(async (id: string): Promise<PublicReport | null> => {
  if (!UUID_PATTERN.test(id)) return null;

  const db = createAnonClient();
  const { data, error } = await db
    .from("public_reports")
    .select(PUBLIC_FEED_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
});
