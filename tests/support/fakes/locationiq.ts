import { http, HttpResponse } from "msw";

// Network-level fake for LocationIQ (spec Testing Decisions): intercepts
// the actual HTTP call at LocationIQ's real endpoint shape, rather than
// mocking whatever wrapper code ticket 06 writes around it.
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

export const locationIqHandlers = [locationIqReverseGeocodeHandler];
