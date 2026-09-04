// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { isOffline } from "@/lib/offline";

function setOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value });
}

describe("isOffline", () => {
  afterEach(() => {
    setOnLine(true);
  });

  it("is false when the browser reports online", () => {
    setOnLine(true);
    expect(isOffline()).toBe(false);
  });

  it("is true when the browser reports offline", () => {
    setOnLine(false);
    expect(isOffline()).toBe(true);
  });
});
