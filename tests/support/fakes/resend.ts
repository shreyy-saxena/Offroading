import { http, HttpResponse } from "msw";

// Network-level fake for Resend (spec Testing Decisions): intercepts the
// actual HTTP call at Resend's real endpoint shape. Not registered as a
// default handler — success/failure is per-test via mswServer.use(...),
// since a single test suite needs to exercise both outcomes.
export const RESEND_SUCCESS_FIXTURE = { id: "test-email-id" };
export const RESEND_FAILURE_FIXTURE = { name: "validation_error", message: "Invalid `to` field" };

export const resendSendSuccessHandler = http.post(
  "https://api.resend.com/emails",
  () => HttpResponse.json(RESEND_SUCCESS_FIXTURE, { status: 200 }),
);

export const resendSendFailureHandler = http.post(
  "https://api.resend.com/emails",
  () => HttpResponse.json(RESEND_FAILURE_FIXTURE, { status: 422 }),
);
