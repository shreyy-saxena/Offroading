import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    hookTimeout: 20000,
    testTimeout: 20000,
    // All test files share one live Supabase project (tests/README.md —
    // no local/disposable project available) and rely on tracked-row
    // cleanup for isolation, which only protects rows a test itself
    // inserted. Ticket 15 added the first full-table mutation
    // (district_mapping is wholly deleted-and-replaced on every upload,
    // by design), which raced against other files' own seeded mapping
    // rows under Vitest's default cross-file parallelism — confirmed live
    // by a flaky run where submit-report.test.ts's own district_mapping
    // row vanished mid-test. Serializing files removes that whole class
    // of race; the suite still finishes in well under a minute.
    fileParallelism: false,
  },
});
