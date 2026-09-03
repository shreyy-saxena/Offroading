import { afterAll, afterEach, beforeAll } from "vitest";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { mswServer } from "./support/msw-server";
import { cleanupTrackedRows } from "./support/db";
import { cleanupTrackedStorageObjects } from "./support/storage";

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
});

afterAll(() => {
  mswServer.close();
});
