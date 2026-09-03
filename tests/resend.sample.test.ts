import { describe, expect, it } from "vitest";
import { mswServer } from "./support/msw-server";
import {
  RESEND_FAILURE_FIXTURE,
  RESEND_SUCCESS_FIXTURE,
  resendSendFailureHandler,
  resendSendSuccessHandler,
} from "./support/fakes/resend";

// Sample test for the Resend network fake (ticket 03 acceptance
// criteria) — both the success and failure case, since ticket 09's
// delivery-status tracking needs to observe both.
describe("Resend fake", () => {
  it("simulates a successful send", async () => {
    mswServer.use(resendSendSuccessHandler);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "authority@example.com", subject: "Pothole report" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(RESEND_SUCCESS_FIXTURE);
  });

  it("simulates a failed send", async () => {
    mswServer.use(resendSendFailureHandler);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "not-an-email", subject: "Pothole report" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toEqual(RESEND_FAILURE_FIXTURE);
  });
});
