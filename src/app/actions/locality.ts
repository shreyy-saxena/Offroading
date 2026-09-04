"use server";

import {
  resolveLocalityCandidates,
  searchLocalities,
  type ResolveLocalityResult,
} from "@/lib/locality/resolve-candidates";

export type { ResolveLocalityResult };

// GOOGLE_MAPS_API_KEY has no NEXT_PUBLIC_ prefix, so these calls can only
// run server-side — these actions are the client-callable boundary.
export async function resolveLocalityCandidatesAction(
  latitude: number,
  longitude: number,
): Promise<ResolveLocalityResult> {
  return resolveLocalityCandidates(latitude, longitude);
}

export async function searchLocalitiesAction(query: string): Promise<ResolveLocalityResult> {
  return searchLocalities(query);
}
