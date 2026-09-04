import { afterAll, afterEach, beforeAll } from "vitest";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Google Maps calls are intercepted by MSW before ever reaching a real
// server, so the value doesn't matter for tests — but the client itself
// refuses to run with no key configured at all, which .env.local doesn't
// set until someone signs up for a real one.
if (!process.env.GOOGLE_MAPS_API_KEY) {
  process.env.GOOGLE_MAPS_API_KEY = "test-key";
}
if (!process.env.RESEND_API_KEY) {
  process.env.RESEND_API_KEY = "test-key";
}

import { mswServer } from "./support/msw-server";
import { cleanupTrackedRows } from "./support/db";
import { cleanupTrackedStorageObjects } from "./support/storage";
import { cleanupTrackedTestUsers } from "./support/auth";

beforeAll(() => {
  // "bypass" lets real network calls (the Supabase REST calls the DB
  // harness makes) pass through untouched — only requests matching a
  // registered handler (LocationIQ, Resend) get intercepted.
  mswServer.listen({ onUnhandledRequest: "bypass" });
});

afterEach(async () => {
  mswServer.resetHandlers();
  await cleanupTrackedRows();
  await cleanupTrackedStorageObjects();
  await cleanupTrackedTestUsers();
});

afterAll(() => {
  mswServer.close();
});
