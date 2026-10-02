import { describe, expect, it, vi } from "vitest";
import { isNewer } from "./updates";

vi.mock("electron", () => ({}));

describe("isNewer", () => {
  it("compares major, minor and patch as numbers", () => {
    expect(isNewer("v0.2.0", "0.1.9")).toBe(true);
    expect(isNewer("0.1.10", "0.1.9")).toBe(true);
    expect(isNewer("v1.0.0", "0.9.9")).toBe(true);
  });

  it("is false for the same or an older version", () => {
    expect(isNewer("v0.1.0", "0.1.0")).toBe(false);
    expect(isNewer("v0.1.0", "0.2.0")).toBe(false);
  });
});
