import { setupServer } from "msw/node";
import { googleMapsHandlers } from "./fakes/google-maps";

// Google Maps' reverse-geocode happy path is registered by default since
// almost every citizen-flow test will hit it incidentally; Resend
// handlers (and Google Maps' other endpoints) are added per-test via
// mswServer.use(...) since success/failure needs to vary per test.
export const mswServer = setupServer(...googleMapsHandlers);
