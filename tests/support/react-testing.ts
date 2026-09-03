import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
// jsdom doesn't implement IndexedDB — needed by any test that touches
// src/components/report-flow/draft-store.ts (ticket 10).
import "fake-indexeddb/auto";
import { _closeForTests } from "@/components/report-flow/draft-store";

// Imported only by component test files (which set
// `// @vitest-environment jsdom`). Kept out of the global setupFiles list
// deliberately — cleanup() touches `document`, which doesn't exist in the
// "node" environment the rest of the suite runs in.
afterEach(async () => {
  cleanup();
  // fake-indexeddb's registry lives on globalThis, which Vitest test
  // files in the same worker can share even when "isolated" — without
  // this, a draft saved in one test file's ReportFlow mount leaks into
  // the next file's. Must close the memoized connection first:
  // deleteDatabase blocks until every open connection closes.
  await _closeForTests();
  indexedDB.deleteDatabase("offroading-report-draft");
});
