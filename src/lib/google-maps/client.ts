import { findCanonicalDistrict } from "@/lib/data/districts";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
// Places: legacy Places API (nearbysearch/autocomplete/details) is
// blocked on newer Cloud projects — confirmed live, not assumed — so
// this uses Places API (New) instead. Geocoding API has no such split
// and stays on the plain REST endpoint above.
const PLACES_NEW_BASE_URL = "https://places.googleapis.com/v1";

export type GoogleAddress = {
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  state_district?: string;
  state?: string;
  country?: string;
};

export type GooglePlace = {
  place_id?: string;
  display_name: string;
  address: GoogleAddress;
};

export class GoogleMapsError extends Error {}

type AddressComponent = { long_name: string; types: string[] };

// Google's address_components carry a granularity hierarchy via `types`,
// not fixed field names like LocationIQ's — map it onto the same flat
// shape LocationIQ used so resolve-candidates.ts needs no changes beyond
// its import line.
function addressFromComponents(components: AddressComponent[]): GoogleAddress {
  const address: GoogleAddress = {};
  for (const component of components) {
    if (component.types.includes("neighborhood")) address.neighbourhood = component.long_name;
    if (component.types.includes("sublocality") || component.types.includes("sublocality_level_1")) {
      address.suburb = component.long_name;
    }
    if (component.types.includes("locality")) address.city = component.long_name;
    if (component.types.includes("administrative_area_level_1")) address.state = component.long_name;
    if (component.types.includes("country")) address.country = component.long_name;
  }

  // The district isn't reliably at a fixed admin level: Google interposes
  // an extra "division" layer for some Indian states (e.g. Karnataka —
  // "Bangalore Division" lands on administrative_area_level_2, and the
  // actual district "Bengaluru Urban" lands one level down, on
  // administrative_area_level_3), confirmed against the real API, not
  // assumed. Rather than trust a specific level number, check every
  // admin-area component against our own canonical district list and use
  // whichever one actually matches.
  const adminAreaCandidates = components.filter((component) =>
    component.types.some(
      (type) =>
        type === "administrative_area_level_2" ||
        type === "administrative_area_level_3" ||
        type === "administrative_area_level_4",
    ),
  );
  const matchedDistrict = adminAreaCandidates.find((component) =>
    findCanonicalDistrict(component.long_name, address.state),
  );
  if (matchedDistrict) address.state_district = matchedDistrict.long_name;
  return address;
}

// No NEXT_PUBLIC_ prefix on GOOGLE_MAPS_API_KEY — server-only, same
// boundary as the Supabase service-role client (and as LOCATIONIQ_API_KEY
// before it).
async function googleMapsGet(url: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new GoogleMapsError("GOOGLE_MAPS_API_KEY is not configured.");
  }

  const fullUrl = new URL(url);
  fullUrl.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    fullUrl.searchParams.set(key, value);
  }

  const response = await fetch(fullUrl.toString());
  if (!response.ok) {
    throw new GoogleMapsError(`Google Maps request to ${url} failed with status ${response.status}`);
  }

  const data = (await response.json()) as { status?: string };
  // Google's Geocoding/Places APIs return HTTP 200 even for a logical
  // failure (REQUEST_DENIED, OVER_QUERY_LIMIT, INVALID_REQUEST, ...) —
  // the real error signal is this `status` field, not the HTTP status.
  // ZERO_RESULTS is not an error (an empty match is a valid outcome).
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new GoogleMapsError(`Google Maps request to ${url} returned status ${data.status}`);
  }
  return data;
}

type GeocodeResult = { place_id?: string; formatted_address: string; address_components?: AddressComponent[] };

export async function reverseGeocode(latitude: number, longitude: number): Promise<GooglePlace> {
  const data = (await googleMapsGet(GEOCODE_URL, { latlng: `${latitude},${longitude}` })) as {
    results?: GeocodeResult[];
  };
  const result = data.results?.[0];
  if (!result) {
    throw new GoogleMapsError("Google Maps reverse geocode returned no results.");
  }
  return {
    place_id: result.place_id,
    display_name: result.formatted_address,
    address: addressFromComponents(result.address_components ?? []),
  };
}

// Places API (New) authenticates via headers (X-Goog-Api-Key), not a
// query param, and bills per-field, so every call must declare which
// fields it wants via X-Goog-FieldMask.
async function placesNewFetch(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; fieldMask: string },
): Promise<unknown> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new GoogleMapsError("GOOGLE_MAPS_API_KEY is not configured.");
  }

  const response = await fetch(`${PLACES_NEW_BASE_URL}${path}`, {
    method: options.method ?? "POST",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": options.fieldMask,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    const message = errorBody.error?.message ?? `status ${response.status}`;
    throw new GoogleMapsError(`Google Places request to ${path} failed: ${message}`);
  }
  return response.json();
}

// Places API (New) address components use longText/types instead of
// legacy's long_name/types — normalize to the shared AddressComponent
// shape so addressFromComponents (above) needs no provider-specific
// branches.
function toAddressComponents(components: { longText: string; types: string[] }[]): AddressComponent[] {
  return components.map((component) => ({ long_name: component.longText, types: component.types }));
}

async function placeDetailsAddress(placeId: string): Promise<AddressComponent[] | null> {
  try {
    const data = (await placesNewFetch(`/places/${placeId}`, {
      method: "GET",
      fieldMask: "addressComponents",
    })) as { addressComponents?: { longText: string; types: string[] }[] };
    return data.addressComponents ? toAddressComponents(data.addressComponents) : null;
  } catch {
    // A single place's Details lookup failing shouldn't drop the rest of
    // the candidate list — same "partial results over none" philosophy
    // as toCandidate() silently dropping an unmatched district.
    return null;
  }
}

// PRD 12.2/12.6's "secondary nearby-places query" to build the 2-4
// candidate list for a GPS point that can sit near the edge of more than
// one administrative area. Places API's Nearby Search only indexes
// POI/business establishments, not administrative localities themselves
// — confirmed live: even "neighborhood" is rejected as a Table A
// includedTypes value, and an unrestricted search returns only
// restaurants/shops/temples, never a bare "Koramangala"-type place. So
// instead of a places-based nearby search, this reverse-geocodes a few
// points sampled a short distance from the GPS fix in each cardinal
// direction, reusing reverseGeocode's already-verified district
// resolution. A citizen genuinely near a boundary between two areas will
// get back two different localities from two of the sample points; one
// comfortably inside a single area just gets it repeated (deduped by
// resolve-candidates.ts's toCandidates).
const NEARBY_SAMPLE_OFFSET_METERS = 400;
const METERS_PER_DEGREE_LATITUDE = 111_320;

function offsetCoordinates(
  latitude: number,
  longitude: number,
  deltaLatMeters: number,
  deltaLngMeters: number,
): { latitude: number; longitude: number } {
  const metersPerDegreeLongitude = METERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180);
  return {
    latitude: latitude + deltaLatMeters / METERS_PER_DEGREE_LATITUDE,
    longitude: longitude + deltaLngMeters / metersPerDegreeLongitude,
  };
}

const SAMPLE_OFFSETS = [
  { deltaLatMeters: NEARBY_SAMPLE_OFFSET_METERS, deltaLngMeters: 0 }, // north
  { deltaLatMeters: -NEARBY_SAMPLE_OFFSET_METERS, deltaLngMeters: 0 }, // south
  { deltaLatMeters: 0, deltaLngMeters: NEARBY_SAMPLE_OFFSET_METERS }, // east
  { deltaLatMeters: 0, deltaLngMeters: -NEARBY_SAMPLE_OFFSET_METERS }, // west
];

export async function nearbyPlaces(latitude: number, longitude: number): Promise<GooglePlace[]> {
  const results = await Promise.allSettled(
    SAMPLE_OFFSETS.map(({ deltaLatMeters, deltaLngMeters }) => {
      const point = offsetCoordinates(latitude, longitude, deltaLatMeters, deltaLngMeters);
      return reverseGeocode(point.latitude, point.longitude);
    }),
  );

  const fulfilled = results.filter((result): result is PromiseFulfilledResult<GooglePlace> => result.status === "fulfilled");

  // Tolerate a few sample points individually failing (e.g. one lands
  // somewhere Google can't geocode) — but if every single one failed the
  // same way, that's a systemic problem (API outage, quota, bad key), not
  // "nothing nearby," and should propagate as a real failure rather than
  // silently reporting an empty candidate list.
  if (fulfilled.length === 0) {
    const firstRejection = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    throw firstRejection?.reason ?? new GoogleMapsError("All nearby location samples failed.");
  }

  return fulfilled.map((result) => result.value);
}

type AutocompletePrediction = { placeId: string; text?: { text: string } };

export async function autocompleteLocality(query: string): Promise<GooglePlace[]> {
  const data = (await placesNewFetch("/places:autocomplete", {
    fieldMask: "*",
    body: { input: query, includedRegionCodes: ["in"] },
  })) as { suggestions?: { placePrediction?: AutocompletePrediction }[] };

  const predictions = (data.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction): prediction is AutocompletePrediction => prediction !== undefined)
    .slice(0, 5);

  const places = await Promise.all(
    predictions.map(async (prediction): Promise<GooglePlace | null> => {
      const components = await placeDetailsAddress(prediction.placeId);
      if (!components) return null;
      return {
        place_id: prediction.placeId,
        display_name: prediction.text?.text ?? "",
        address: addressFromComponents(components),
      };
    }),
  );

  return places.filter((place): place is GooglePlace => place !== null);
}
