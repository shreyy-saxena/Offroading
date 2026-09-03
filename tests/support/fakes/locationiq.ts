import { http, HttpResponse } from "msw";

// Network-level fake for LocationIQ (spec Testing Decisions): intercepts
// the actual HTTP call at LocationIQ's real endpoint shape, rather than
// mocking whatever wrapper code tickets 06+ write around it.

// Ticket 03's original sample fixture/handler — kept as-is (still used by
// tests/locationiq.sample.test.ts) even though "Test District" isn't a
// real canonical district; it predates ticket 06's district-matching.
export const LOCATIONIQ_FIXTURE = {
  display_name: "Test Locality, Test District, India",
  address: {
    suburb: "Test Locality",
    state_district: "Test District",
    country: "India",
  },
};

export const locationIqReverseGeocodeHandler = http.get(
  "https://us1.locationiq.com/v1/reverse",
  () => HttpResponse.json(LOCATIONIQ_FIXTURE),
);

// Ticket 06 fixtures — district names are real canonical entries
// (src/lib/data/districts.ts) so resolve-candidates.ts's district
// matching actually succeeds against them.
export const LOCATIONIQ_REVERSE_MATCH_FIXTURE = {
  display_name: "Indiranagar, Bengaluru Urban, Karnataka, India",
  address: { suburb: "Indiranagar", state_district: "Bengaluru Urban", country: "India" },
};

export const LOCATIONIQ_NEARBY_MATCH_FIXTURE = [
  {
    display_name: "Koramangala, Bengaluru Urban, Karnataka, India",
    address: { suburb: "Koramangala", state_district: "Bengaluru Urban", country: "India" },
  },
  {
    display_name: "HSR Layout, Bengaluru Urban, Karnataka, India",
    address: { suburb: "HSR Layout", state_district: "Bengaluru Urban", country: "India" },
  },
  // Unmatched district on purpose — resolve-candidates.ts should drop
  // this one rather than guess a district for it.
  {
    display_name: "Some Place, Not A Real District, India",
    address: { suburb: "Some Place", state_district: "Not A Real District", country: "India" },
  },
];

export const locationIqReverseMatchHandler = http.get(
  "https://us1.locationiq.com/v1/reverse",
  () => HttpResponse.json(LOCATIONIQ_REVERSE_MATCH_FIXTURE),
);

export const locationIqNearbyMatchHandler = http.get(
  "https://us1.locationiq.com/v1/nearby",
  () => HttpResponse.json(LOCATIONIQ_NEARBY_MATCH_FIXTURE),
);

export const locationIqNearbyEmptyHandler = http.get(
  "https://us1.locationiq.com/v1/nearby",
  () => HttpResponse.json([]),
);

export const locationIqReverseErrorHandler = http.get(
  "https://us1.locationiq.com/v1/reverse",
  () => HttpResponse.json({ error: "Unable to geocode" }, { status: 500 }),
);

export const locationIqNearbyErrorHandler = http.get(
  "https://us1.locationiq.com/v1/nearby",
  () => HttpResponse.json({ error: "Unable to geocode" }, { status: 500 }),
);

export const LOCATIONIQ_AUTOCOMPLETE_FIXTURE = [
  {
    display_name: "Jayanagar, Bengaluru Urban, Karnataka, India",
    address: { suburb: "Jayanagar", state_district: "Bengaluru Urban", country: "India" },
  },
];

export const locationIqAutocompleteHandler = http.get(
  "https://us1.locationiq.com/v1/autocomplete",
  () => HttpResponse.json(LOCATIONIQ_AUTOCOMPLETE_FIXTURE),
);

export const locationIqAutocompleteErrorHandler = http.get(
  "https://us1.locationiq.com/v1/autocomplete",
  () => HttpResponse.json({ error: "Unable to search" }, { status: 500 }),
);

export const locationIqHandlers = [locationIqReverseGeocodeHandler];
