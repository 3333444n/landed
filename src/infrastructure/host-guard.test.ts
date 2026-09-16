import { describe, expect, it } from "vitest";
import { hostnameOf, isAllowedHost } from "./host-guard";

describe("isAllowedHost", () => {
  it("accepts the loopback names with or without a port", () => {
    expect(isAllowedHost("localhost", null)).toBe(true);
    expect(isAllowedHost("localhost:3000", null)).toBe(true);
    expect(isAllowedHost("127.0.0.1:3417", null)).toBe(true);
    expect(isAllowedHost("[::1]:3000", null)).toBe(true);
    expect(isAllowedHost("[::1]", null)).toBe(true);
    expect(isAllowedHost("LOCALHOST", null)).toBe(true);
  });
  it("refuses any other host, spoofed prefixes and a missing header", () => {
    expect(isAllowedHost("evil.example", null)).toBe(false);
    expect(isAllowedHost("localhost.evil.example", null)).toBe(false);
    expect(isAllowedHost("127.0.0.1.evil.example", null)).toBe(false);
    expect(isAllowedHost("evil.example:127.0.0.1", null)).toBe(false);
    expect(isAllowedHost(null, null)).toBe(false);
    expect(isAllowedHost("", null)).toBe(false);
    expect(isAllowedHost("[", null)).toBe(false);
    expect(isAllowedHost(":3000", null)).toBe(false);
  });
  it("accepts configured extra hostnames only when listed", () => {
    expect(isAllowedHost("landed.lan:3000", null, ["landed.lan"])).toBe(true);
    expect(isAllowedHost("landed.lan", null, [])).toBe(false);
    expect(isAllowedHost("other.lan", null, ["landed.lan"])).toBe(false);
  });
  it("checks the Origin hostname when the header is present", () => {
    expect(isAllowedHost("localhost:3000", "http://localhost:3000")).toBe(true);
    expect(isAllowedHost("localhost:3000", "http://127.0.0.1:3000")).toBe(true);
    expect(isAllowedHost("localhost:3000", "http://[::1]:3000")).toBe(true);
    expect(isAllowedHost("localhost:3000", "")).toBe(true);
    expect(isAllowedHost("localhost:3000", "https://evil.example")).toBe(false);
    expect(isAllowedHost("localhost:3000", "null")).toBe(false);
    expect(isAllowedHost("localhost:3000", "not a url")).toBe(false);
    expect(isAllowedHost("localhost:3000", "chrome-extension://abc")).toBe(false);
    expect(isAllowedHost("localhost:3000", "http://landed.lan", ["landed.lan"])).toBe(true);
  });
});

describe("hostnameOf", () => {
  it("drops the port and the IPv6 brackets", () => {
    expect(hostnameOf("example.com:8080")).toBe("example.com");
    expect(hostnameOf("[::1]:8080")).toBe("::1");
    expect(hostnameOf(" localhost ")).toBe("localhost");
    expect(hostnameOf(null)).toBeNull();
  });
});
