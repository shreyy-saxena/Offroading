import { http, HttpResponse } from "msw";

// Network-level fake for Resend (spec Testing Decisions): intercepts the
// actual HTTP call at Resend's real endpoint shape. Not registered as a
// default handler — success/failure is per-test via mswServer.use(...),
// since a single test suite needs to exercise multiple outcomes.
export const RESEND_SUCCESS_FIXTURE = { id: "test-email-id" };
export const RESEND_FAILURE_FIXTURE = { name: "validation_error", message: "Invalid `to` field" };
export const RESEND_TRANSIENT_FAILURE_FIXTURE = { name: "rate_limit_exceeded", message: "Too many requests" };

export const resendSendSuccessHandler = http.post(
  "https://api.resend.com/emails",
  () => HttpResponse.json(RESEND_SUCCESS_FIXTURE, { status: 200 }),
);

// 422 = permanent (bad request), not retried.
export const resendSendFailureHandler = http.post(
  "https://api.resend.com/emails",
  () => HttpResponse.json(RESEND_FAILURE_FIXTURE, { status: 422 }),
);

// 429 every time = transient failures that never recover within the
// retry budget, settling to "failed".
export const resendSendTransientFailureHandler = http.post(
  "https://api.resend.com/emails",
  () => HttpResponse.json(RESEND_TRANSIENT_FAILURE_FIXTURE, { status: 429 }),
);

// Fails once (transient) then succeeds — exercises the retry path itself.
// A factory, not a shared handler: each call gets its own call counter,
// so tests don't leak state into each other.
export function createResendTransientThenSuccessHandler() {
  let callCount = 0;
  return http.post("https://api.resend.com/emails", () => {
    callCount += 1;
    if (callCount === 1) {
      return HttpResponse.json(RESEND_TRANSIENT_FAILURE_FIXTURE, { status: 429 });
    }
    return HttpResponse.json(RESEND_SUCCESS_FIXTURE, { status: 200 });
  });
}
