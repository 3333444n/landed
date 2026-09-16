import { describe, expect, it } from "vitest";
import { bearerMatches } from "./auth";

const token = "abcdefghijklmnopqrstuvwxyz0123";

describe("bearerMatches", () => {
  it("accepts the exact token behind the Bearer scheme", () => {
    expect(bearerMatches(`Bearer ${token}`, token)).toBe(true);
    expect(bearerMatches(`bearer ${token}`, token)).toBe(true);
    expect(bearerMatches(`Bearer   ${token}  `, token)).toBe(true);
  });
  it("refuses a missing header, another scheme, a prefix and a longer value", () => {
    expect(bearerMatches(null, token)).toBe(false);
    expect(bearerMatches("", token)).toBe(false);
    expect(bearerMatches(token, token)).toBe(false);
    expect(bearerMatches(`Basic ${token}`, token)).toBe(false);
    expect(bearerMatches(`Bearer ${token.slice(0, -1)}`, token)).toBe(false);
    expect(bearerMatches(`Bearer ${token}x`, token)).toBe(false);
    expect(bearerMatches("Bearer ", token)).toBe(false);
  });
});
