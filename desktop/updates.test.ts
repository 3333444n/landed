import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { dmgName, expectedSha256, isNewer } from "./updates";

vi.mock("electron", () => ({}));
vi.mock("electron-updater", () => ({}));

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

describe("dmgName", () => {
  it("names the dmg for the Mac's architecture", () => {
    expect(dmgName("0.1.3", "arm64")).toBe("Landed-0.1.3-arm64.dmg");
    expect(dmgName("0.1.3", "x64")).toBe("Landed-0.1.3-x64.dmg");
  });
});

describe("expectedSha256", () => {
  it("reads the hex digest that a download's hash must match", () => {
    const hex = createHash("sha256").update(Buffer.from("installer bytes")).digest("hex");
    expect(expectedSha256(`sha256:${hex}`)).toBe(hex);
  });

  it("refuses a missing or malformed digest rather than skipping the check", () => {
    expect(() => expectedSha256(undefined)).toThrow("no checksum");
    expect(() => expectedSha256("sha256:abc")).toThrow("no checksum");
  });
});
