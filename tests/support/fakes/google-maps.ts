import { http, HttpResponse } from "msw";

// Network-level fake for Google Maps Platform (spec Testing Decisions):
// intercepts the actual HTTP calls at Google's real endpoint shapes —
// Geocoding API (legacy REST) for reverse geocoding, Places API (New)
// for autocomplete — rather than mocking whatever wrapper code
// src/lib/google-maps/client.ts writes around them.
//
// Nearby-candidate building (client.ts's nearbyPlaces) is NOT a separate
// endpoint to fake: confirmed live against the real API that Places'
// Nearby Search can't search for administrative localities at all (only
// POIs/businesses, and even "neighborhood" is rejected as a search
// filter), so nearbyPlaces instead reverse-geocodes a few points sampled
// around the GPS fix — it's built entirely on the same Geocoding API
// endpoint faked below, differentiated by which coordinates were queried.

type AddressComponentFixture = { long_name: string; short_name: string; types: string[] };

function addressComponents(entries: [name: string, types: string[]][]): AddressComponentFixture[] {
  return entries.map(([name, types]) => ({ long_name: name, short_name: name, types }));
}

const INDIRANAGAR_COMPONENTS = addressComponents([
  ["Indiranagar", ["neighborhood", "political"]],
  ["Bengaluru Urban", ["administrative_area_level_2", "political"]],
  ["Karnataka", ["administrative_area_level_1", "political"]],
  ["India", ["country", "political"]],
]);

const KORAMANGALA_COMPONENTS = addressComponents([
  ["Koramangala", ["sublocality", "sublocality_level_1", "political"]],
  ["Bengaluru Urban", ["administrative_area_level_2", "political"]],
  ["Karnataka", ["administrative_area_level_1", "political"]],
  ["India", ["country", "political"]],
]);

// Deliberately at a level (level_2) our own DISTRICTS table has no entry
// for, and no other admin level matches either — proves toCandidate()
// drops a place with no canonical district match, same as before.
const UNMATCHED_DISTRICT_COMPONENTS = addressComponents([
  ["Some Place", ["sublocality", "political"]],
  ["Not A Real District", ["administrative_area_level_2", "political"]],
  ["India", ["country", "political"]],
]);

// This state has a real, hand-maintained district ("Bengaluru Urban")
// one level down from where Google puts an intermediate "division" —
// same shape as the real bug found and fixed against the live API.
const DIVISION_LAYER_COMPONENTS = addressComponents([
  ["Jayanagar", ["neighborhood", "political"]],
  ["Bangalore Division", ["administrative_area_level_2", "political"]],
  ["Bengaluru Urban", ["administrative_area_level_3", "political"]],
  ["Karnataka", ["administrative_area_level_1", "political"]],
  ["India", ["country", "political"]],
]);

function geocodeFixture(components: AddressComponentFixture[], formattedAddress: string, placeId: string) {
  return { status: "OK", results: [{ place_id: placeId, formatted_address: formattedAddress, address_components: components }] };
}

export const GOOGLE_GEOCODE_INDIRANAGAR_FIXTURE = geocodeFixture(
  INDIRANAGAR_COMPONENTS,
  "Indiranagar, Bengaluru, Karnataka, India",
  "place-indiranagar",
);
export const GOOGLE_GEOCODE_KORAMANGALA_FIXTURE = geocodeFixture(
  KORAMANGALA_COMPONENTS,
  "Koramangala, Bengaluru, Karnataka, India",
  "place-koramangala",
);
export const GOOGLE_GEOCODE_UNMATCHED_FIXTURE = geocodeFixture(
  UNMATCHED_DISTRICT_COMPONENTS,
  "Some Place, India",
  "place-unmatched",
);
export const GOOGLE_GEOCODE_DIVISION_LAYER_FIXTURE = geocodeFixture(
  DIVISION_LAYER_COMPONENTS,
  "Jayanagar, Bengaluru, Karnataka, India",
  "place-jayanagar",
);

// Every reverse-geocode call (both the primary point and nearbyPlaces'
// sample points) hits this same URL — tests differentiate scenarios by
// registering a handler that branches on the queried `latlng`, or by
// just always returning the same fixture for a "not near a boundary"
// scenario.
export const googleGeocodeMatchHandler = http.get(
  "https://maps.googleapis.com/maps/api/geocode/json",
  () => HttpResponse.json(GOOGLE_GEOCODE_INDIRANAGAR_FIXTURE),
);

// The primary (center) point resolves; every sampled nearby point is a
// genuinely different, real place — simulating a citizen near the
// boundary between two named areas.
export function googleGeocodeCenterAndDistinctNearbyHandler(centerLatitude: number, centerLongitude: number) {
  const centerLatlng = `${centerLatitude},${centerLongitude}`;
  return http.get("https://maps.googleapis.com/maps/api/geocode/json", ({ request }) => {
    const latlng = new URL(request.url).searchParams.get("latlng");
    return HttpResponse.json(
      latlng === centerLatlng ? GOOGLE_GEOCODE_INDIRANAGAR_FIXTURE : GOOGLE_GEOCODE_KORAMANGALA_FIXTURE,
    );
  });
}

// The primary point resolves to a real district; every sampled nearby
// point resolves to a place with no canonical district match, and must
// be dropped.
export function googleGeocodeCenterMatchesNearbyUnmatchedHandler(centerLatitude: number, centerLongitude: number) {
  const centerLatlng = `${centerLatitude},${centerLongitude}`;
  return http.get("https://maps.googleapis.com/maps/api/geocode/json", ({ request }) => {
    const latlng = new URL(request.url).searchParams.get("latlng");
    return HttpResponse.json(
      latlng === centerLatlng ? GOOGLE_GEOCODE_INDIRANAGAR_FIXTURE : GOOGLE_GEOCODE_UNMATCHED_FIXTURE,
    );
  });
}

export const googleGeocodeUnmatchedHandler = http.get(
  "https://maps.googleapis.com/maps/api/geocode/json",
  () => HttpResponse.json(GOOGLE_GEOCODE_UNMATCHED_FIXTURE),
);

// Google's error is a 200-with-status field, not an HTTP error code — the
// realistic failure mode client.ts's status check has to handle.
export const googleGeocodeErrorHandler = http.get(
  "https://maps.googleapis.com/maps/api/geocode/json",
  () => HttpResponse.json({ status: "REQUEST_DENIED", error_message: "Unable to geocode" }),
);

// --- Autocomplete + Place Details (Places API (New)) ---

export const GOOGLE_AUTOCOMPLETE_FIXTURE = {
  suggestions: [
    { placePrediction: { placeId: "place-jayanagar-autocomplete", text: { text: "Jayanagar, Bengaluru, Karnataka, India" } } },
  ],
};

export const googleAutocompleteMatchHandler = http.post(
  "https://places.googleapis.com/v1/places:autocomplete",
  () => HttpResponse.json(GOOGLE_AUTOCOMPLETE_FIXTURE),
);

export const googleAutocompleteErrorHandler = http.post(
  "https://places.googleapis.com/v1/places:autocomplete",
  () => HttpResponse.json({ error: { message: "Unable to search" } }, { status: 403 }),
);

const PLACE_DETAILS_BY_ID: Record<string, AddressComponentFixture[]> = {
  "place-jayanagar-autocomplete": INDIRANAGAR_COMPONENTS.map((c) =>
    c.long_name === "Indiranagar" ? { ...c, long_name: "Jayanagar", short_name: "Jayanagar" } : c,
  ),
};

export const googlePlaceDetailsHandler = http.get(
  "https://places.googleapis.com/v1/places/:placeId",
  ({ params }) => {
    const placeId = params.placeId as string;
    const addressComponentsForPlace = PLACE_DETAILS_BY_ID[placeId];
    if (!addressComponentsForPlace) {
      return HttpResponse.json({ error: { message: "not found" } }, { status: 404 });
    }
    return HttpResponse.json({
      id: placeId,
      addressComponents: addressComponentsForPlace.map((c) => ({ longText: c.long_name, types: c.types })),
    });
  },
);

export const googlePlaceDetailsErrorHandler = http.get(
  "https://places.googleapis.com/v1/places/:placeId",
  () => HttpResponse.json({ error: { message: "denied" } }, { status: 403 }),
);

// Registered globally (mirrors LocationIQ's old default) since almost
// every citizen-flow test hits reverse geocode incidentally; the rest are
// added per-test via mswServer.use(...).
export const googleMapsHandlers = [googleGeocodeMatchHandler];
