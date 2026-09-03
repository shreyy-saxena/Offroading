import { describe, expect, it } from "vitest";
import { LOCATIONIQ_FIXTURE } from "./support/fakes/locationiq";

// Sample test for the LocationIQ network fake (ticket 03 acceptance
// criteria). Calls the real endpoint URL directly to prove the fake
// intercepts at the HTTP boundary; ticket 06's actual wrapper code will
// hit this same URL and get the same canned response.
describe("LocationIQ fake", () => {
  it("returns the canned reverse-geocoding fixture", async () => {
    const response = await fetch(
      "https://us1.locationiq.com/v1/reverse?key=fake-key&lat=12.34&lon=56.78&format=json",
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(LOCATIONIQ_FIXTURE);
  });
});
