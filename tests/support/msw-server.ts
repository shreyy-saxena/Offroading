import { setupServer } from "msw/node";
import { locationIqHandlers } from "./fakes/locationiq";

// LocationIQ is registered by default since almost every citizen-flow
// test will hit it incidentally; Resend handlers are added per-test via
// mswServer.use(...) since success/failure needs to vary per test.
export const mswServer = setupServer(...locationIqHandlers);
