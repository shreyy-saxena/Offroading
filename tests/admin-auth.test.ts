import { describe, expect, it } from "vitest";
import { getAdminUser, signInAdmin } from "@/lib/auth/admin";
import { createTestUser, setTestUserAdmin, signInAsTestUser, testAuthClient } from "./support/auth";

// Integration tests against real Supabase Auth (ticket 03's harness, no
// mocking of auth itself) — ticket 14's acceptance criteria.
describe("admin authorization", () => {
  it("recognizes a seeded admin account", async () => {
    const admin = await createTestUser({ admin: true });
    const client = await signInAsTestUser(admin);

    const user = await getAdminUser(client);
    expect(user?.id).toBe(admin.id);
  });

  it("rejects a seeded non-admin account", async () => {
    const nonAdmin = await createTestUser({ admin: false });
    const client = await signInAsTestUser(nonAdmin);

    const user = await getAdminUser(client);
    expect(user).toBeNull();
  });

  it("re-evaluates the admin flag on the very next request without requiring re-login", async () => {
    const admin = await createTestUser({ admin: true });
    const client = await signInAsTestUser(admin);

    expect(await getAdminUser(client)).not.toBeNull();

    // Same already-signed-in client, same still-unexpired session — only
    // the underlying row changed. If this came back non-null, the check
    // would be trusting a cached login-time flag instead of FR7's
    // every-request re-verification.
    await setTestUserAdmin(admin.id, false);
    expect(await getAdminUser(client)).toBeNull();

    // And the reverse: re-granting also takes effect immediately.
    await setTestUserAdmin(admin.id, true);
    expect(await getAdminUser(client)).not.toBeNull();
  });
});

describe("signInAdmin (login Server Action's logic)", () => {
  it("signs in a seeded admin", async () => {
    const admin = await createTestUser({ admin: true });
    const result = await signInAdmin(testAuthClient(), admin.email, admin.password);
    expect(result.outcome).toBe("signed-in");
  });

  it("rejects a seeded non-admin and doesn't leave a live session", async () => {
    const nonAdmin = await createTestUser({ admin: false });
    const client = testAuthClient();

    const result = await signInAdmin(client, nonAdmin.email, nonAdmin.password);
    expect(result.outcome).toBe("error");

    const { data } = await client.auth.getUser();
    expect(data.user).toBeNull();
  });

  it("rejects a wrong password", async () => {
    const admin = await createTestUser({ admin: true });
    const result = await signInAdmin(testAuthClient(), admin.email, "not-the-right-password");
    expect(result.outcome).toBe("error");
  });
});
