import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkSubmissionRateLimit } from "@/lib/reports/rate-limit";
import { testDbClient } from "./support/db";

// Integration tests against the real submission_attempts table (ticket
// 03's harness) — ticket 17's acceptance criteria. Uses a short window
// and low threshold via env overrides so the test doesn't need to wait
// out a real 10-minute window.
describe("checkSubmissionRateLimit", () => {
  const originalWindow = process.env.SUBMISSION_RATE_LIMIT_WINDOW_MS;
  const originalMax = process.env.SUBMISSION_RATE_LIMIT_MAX;

  beforeEach(() => {
    process.env.SUBMISSION_RATE_LIMIT_WINDOW_MS = "60000"; // 1 minute
    process.env.SUBMISSION_RATE_LIMIT_MAX = "3";
  });

  afterEach(async () => {
    if (originalWindow === undefined) delete process.env.SUBMISSION_RATE_LIMIT_WINDOW_MS;
    else process.env.SUBMISSION_RATE_LIMIT_WINDOW_MS = originalWindow;
    if (originalMax === undefined) delete process.env.SUBMISSION_RATE_LIMIT_MAX;
    else process.env.SUBMISSION_RATE_LIMIT_MAX = originalMax;

    // No trackRow support for this table (no single-row primary key a
    // test owns cleanly to filter by) — every identifier here is a fresh
    // random UUID per test, so a targeted delete by identifier is exact
    // and doesn't touch any other test's rows.
    const db = testDbClient();
    await db.from("submission_attempts").delete().in("identifier", usedIdentifiers.splice(0));
  });

  const usedIdentifiers: string[] = [];
  function freshIdentifier(): string {
    const id = `test-${randomUUID()}`;
    usedIdentifiers.push(id);
    return id;
  }

  it("allows a legitimate single submission", async () => {
    const { allowed } = await checkSubmissionRateLimit(freshIdentifier());
    expect(allowed).toBe(true);
  });

  it("allows submissions up to the threshold, then rejects the next one", async () => {
    const identifier = freshIdentifier();

    // MAX=3: first 3 calls allowed, the 4th (N+1) is rejected.
    expect((await checkSubmissionRateLimit(identifier)).allowed).toBe(true);
    expect((await checkSubmissionRateLimit(identifier)).allowed).toBe(true);
    expect((await checkSubmissionRateLimit(identifier)).allowed).toBe(true);
    expect((await checkSubmissionRateLimit(identifier)).allowed).toBe(false);
  });

  it("does not affect a different identifier's own window", async () => {
    const identifierA = freshIdentifier();
    const identifierB = freshIdentifier();

    await checkSubmissionRateLimit(identifierA);
    await checkSubmissionRateLimit(identifierA);
    await checkSubmissionRateLimit(identifierA);
    expect((await checkSubmissionRateLimit(identifierA)).allowed).toBe(false);

    // A different identifier has never made a request — unaffected.
    expect((await checkSubmissionRateLimit(identifierB)).allowed).toBe(true);
  });

  it("a rejected attempt still counts toward the window (retrying immediately doesn't reset it)", async () => {
    const identifier = freshIdentifier();
    await checkSubmissionRateLimit(identifier);
    await checkSubmissionRateLimit(identifier);
    await checkSubmissionRateLimit(identifier);

    const first = await checkSubmissionRateLimit(identifier);
    const second = await checkSubmissionRateLimit(identifier);
    expect(first.allowed).toBe(false);
    expect(second.allowed).toBe(false);
  });

  it("respects an explicit env override for the threshold", async () => {
    process.env.SUBMISSION_RATE_LIMIT_MAX = "1";
    const identifier = freshIdentifier();

    expect((await checkSubmissionRateLimit(identifier)).allowed).toBe(true);
    expect((await checkSubmissionRateLimit(identifier)).allowed).toBe(false);
  });
});
