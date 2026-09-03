const BASE_URL = "https://us1.locationiq.com/v1";

export type LocationIqAddress = {
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  state_district?: string;
  state?: string;
  country?: string;
};

export type LocationIqPlace = {
  place_id?: string;
  display_name: string;
  address: LocationIqAddress;
};

export class LocationIqError extends Error {}

// No NEXT_PUBLIC_ prefix on LOCATIONIQ_API_KEY (ticket 01's env scaffold)
// — these calls are server-only, same boundary as the Supabase
// service-role client.
async function locationIqGet(path: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) {
    throw new LocationIqError("LOCATIONIQ_API_KEY is not configured.");
  }

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new LocationIqError(`LocationIQ request to ${path} failed with status ${response.status}`);
  }
  return response.json();
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<LocationIqPlace> {
  const data = await locationIqGet("/reverse", { lat: String(latitude), lon: String(longitude) });
  return data as LocationIqPlace;
}

// PRD 12.2's "secondary nearby-places query" — LocationIQ's own Nearby
// API rather than a separate service (e.g. Overpass, which the ticket
// only offered as an example): the spec's Testing Decisions already
// scope this feature to exactly two third-party dependencies (LocationIQ,
// Resend), and Nearby fits the same purpose without adding a third.
export async function nearbyPlaces(latitude: number, longitude: number): Promise<LocationIqPlace[]> {
  const data = await locationIqGet("/nearby", {
    lat: String(latitude),
    lon: String(longitude),
    tag: "place",
    radius: "1500",
  });
  return Array.isArray(data) ? (data as LocationIqPlace[]) : [];
}

export async function autocompleteLocality(query: string): Promise<LocationIqPlace[]> {
  const data = await locationIqGet("/autocomplete", { q: query, countrycodes: "in", limit: "5" });
  return Array.isArray(data) ? (data as LocationIqPlace[]) : [];
}
