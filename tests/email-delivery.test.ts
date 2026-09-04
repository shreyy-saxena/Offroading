import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { mswServer } from "./support/msw-server";
import {
  createResendTransientThenSuccessHandler,
  RESEND_SUCCESS_FIXTURE,
  resendSendFailureHandler,
  resendSendSuccessHandler,
  resendSendTransientFailureHandler,
} from "./support/fakes/resend";
import { sendComplaintEmail, sendQueuedReportConfirmation } from "@/lib/email/deliver-report-email";

const SAMPLE_REPORT = {
  photoUrl: "https://example.com/photo.jpg",
  locality: "Indiranagar",
  district: "Bengaluru Urban",
  latitude: 12.9716,
  longitude: 77.5946,
  reporterType: "resident" as const,
  reporterName: "Test Reporter",
  reporterMobile: "9999999999",
  reporterEmail: "reporter@example.com",
};

// Ticket 09's three required scenarios — using ticket 03's Resend fake,
// never the real API. Assert on the observable outcome (persisted
// status/error), not on internal retry call counts.
describe("sendComplaintEmail", () => {
  it("settles to sent on a successful send", async () => {
    mswServer.use(resendSendSuccessHandler);

    const outcome = await sendComplaintEmail(SAMPLE_REPORT, ["authority@example.com"]);

    expect(outcome).toEqual({ status: "sent" });
  });

  it("retries a transient failure and settles to sent once it recovers", async () => {
    mswServer.use(createResendTransientThenSuccessHandler());

    const outcome = await sendComplaintEmail(SAMPLE_REPORT, ["authority@example.com"]);

    expect(outcome).toEqual({ status: "sent" });
  });

  it("settles to failed with an error detail on a permanent failure, no retry", async () => {
    mswServer.use(resendSendFailureHandler);

    const outcome = await sendComplaintEmail(SAMPLE_REPORT, ["not-an-email"]);

    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") throw new Error("expected a failed outcome");
    expect(outcome.error).toBeTruthy();
  });

  it("settles to failed (not an infinite retry) when transient failures never recover", async () => {
    mswServer.use(resendSendTransientFailureHandler);

    const outcome = await sendComplaintEmail(SAMPLE_REPORT, ["authority@example.com"]);

    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") throw new Error("expected a failed outcome");
    expect(outcome.error).toBeTruthy();
  });

  // A state can list more than one authority address — the complaint is
  // sent once, to every address, not once per address.
  it("sends a single request naming every recipient when a state has multiple addresses", async () => {
    let capturedTo: unknown;
    mswServer.use(
      http.post("https://api.resend.com/emails", async ({ request }) => {
        const body = (await request.json()) as { to: unknown };
        capturedTo = body.to;
        return HttpResponse.json(RESEND_SUCCESS_FIXTURE, { status: 200 });
      }),
    );

    const outcome = await sendComplaintEmail(SAMPLE_REPORT, ["first@example.com", "second@example.com"]);

    expect(outcome).toEqual({ status: "sent" });
    expect(capturedTo).toEqual(["first@example.com", "second@example.com"]);
  });
});

describe("sendQueuedReportConfirmation", () => {
  it("is a distinct, callable path from the complaint send", async () => {
    mswServer.use(resendSendSuccessHandler);

    const outcome = await sendQueuedReportConfirmation({
      to: "reporter@example.com",
      locality: "Indiranagar",
      district: "Bengaluru Urban",
    });

    expect(outcome).toEqual({ status: "sent" });
  });
});
