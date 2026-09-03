import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Imported only by component test files (which set
// `// @vitest-environment jsdom`). Kept out of the global setupFiles list
// deliberately — cleanup() touches `document`, which doesn't exist in the
// "node" environment the rest of the suite runs in.
afterEach(() => {
  cleanup();
});
