import { findCanonicalDistrict } from "@/lib/data/districts";
import {
  LocationIqError,
  autocompleteLocality,
  nearbyPlaces,
  reverseGeocode,
  type LocationIqPlace,
} from "@/lib/locationiq/client";

export type LocalityCandidate = { locality: string; district: string };

export type ResolveLocalityResult =
  | { ok: true; candidates: LocalityCandidate[] }
  | { ok: false; error: string };

const MAX_CANDIDATES = 4;

function toCandidate(place: LocationIqPlace): LocalityCandidate | null {
  const address = place.address ?? {};
  const locality = address.suburb || address.neighbourhood || address.city;
  // District is never inferred from free text or guessed from an
  // unrecognized name — only a place LocationIQ maps onto our own
  // canonical list becomes a candidate (PRD 12.2, spec Implementation
  // Decisions "Canonical district table").
  const district = address.state_district ? findCanonicalDistrict(address.state_district) : null;
  if (!locality || !district) return null;
  return { locality, district: district.name };
}

function dedupe(candidates: LocalityCandidate[]): LocalityCandidate[] {
  const seen = new Set<string>();
  const result: LocalityCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.locality.toLowerCase()}|${candidate.district.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

function toCandidates(places: LocationIqPlace[]): LocalityCandidate[] {
  return dedupe(
    places.map(toCandidate).filter((candidate): candidate is LocalityCandidate => candidate !== null),
  ).slice(0, MAX_CANDIDATES);
}

// Reverse geocode + Nearby run independently (Promise.allSettled, not
// .all): if one fails, the other's results still reach the citizen
// rather than the whole candidate list being discarded. Only a total
// failure of both surfaces as ok:false, distinct from a legitimate
// zero-candidate result — the caller shows a different message for each.
export async function resolveLocalityCandidates(
  latitude: number,
  longitude: number,
): Promise<ResolveLocalityResult> {
  const [reverseResult, nearbyResult] = await Promise.allSettled([
    reverseGeocode(latitude, longitude),
    nearbyPlaces(latitude, longitude),
  ]);

  if (reverseResult.status === "rejected" && nearbyResult.status === "rejected") {
    return { ok: false, error: "We couldn't reach our location service — search manually instead." };
  }

  const places: LocationIqPlace[] = [];
  if (reverseResult.status === "fulfilled") places.push(reverseResult.value);
  if (nearbyResult.status === "fulfilled") places.push(...nearbyResult.value);

  return { ok: true, candidates: toCandidates(places) };
}

export async function searchLocalities(query: string): Promise<ResolveLocalityResult> {
  const trimmed = query.trim();
  if (!trimmed) return { ok: true, candidates: [] };

  try {
    const places = await autocompleteLocality(trimmed);
    return { ok: true, candidates: toCandidates(places) };
  } catch (error) {
    if (error instanceof LocationIqError) {
      return {
        ok: false,
        error: "We couldn't search locations right now — you can still type your locality and pick its district.",
      };
    }
    throw error;
  }
}
