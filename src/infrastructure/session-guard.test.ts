import { describe, expect, it } from "vitest";
import { cookieValue, hasValidSession } from "./session-guard";

const secret = "k3Yq9-Fv_2mWb7Lr0TzX4nHc8PjS6dAe";

describe("hasValidSession", () => {
  it("allows every request when no secret is configured", () => {
    expect(hasValidSession(null, undefined)).toBe(true);
    expect(hasValidSession("other=1", undefined)).toBe(true);
    expect(hasValidSession(null, "")).toBe(true);
    expect(hasValidSession(null, "   ")).toBe(true);
  });
  it("refuses a missing cookie header or a missing session cookie", () => {
    expect(hasValidSession(null, secret)).toBe(false);
    expect(hasValidSession("", secret)).toBe(false);
    expect(hasValidSession("theme=dark; lang=en", secret)).toBe(false);
  });
  it("refuses a wrong, empty, prefixed or extended value", () => {
    expect(hasValidSession("landed_session=nope", secret)).toBe(false);
    expect(hasValidSession("landed_session=", secret)).toBe(false);
    expect(hasValidSession(`landed_session=${secret.slice(0, -1)}`, secret)).toBe(false);
    expect(hasValidSession(`landed_session=${secret}x`, secret)).toBe(false);
    expect(hasValidSession(`landed_session=${secret.toUpperCase()}`, secret)).toBe(false);
  });
  it("accepts the exact value, alone or among other cookies", () => {
    expect(hasValidSession(`landed_session=${secret}`, secret)).toBe(true);
    expect(hasValidSession(`theme=dark; landed_session=${secret}; lang=en`, secret)).toBe(true);
    expect(hasValidSession(`theme=dark;landed_session=${secret}`, secret)).toBe(true);
  });
  it("does not accept a similarly named cookie", () => {
    expect(hasValidSession(`xlanded_session=${secret}`, secret)).toBe(false);
    expect(hasValidSession(`landed_session_old=${secret}`, secret)).toBe(false);
  });
  it("tolerates a malformed header without throwing", () => {
    expect(hasValidSession(";;;", secret)).toBe(false);
    expect(hasValidSession("garbage", secret)).toBe(false);
    expect(hasValidSession(`garbage; =x; landed_session=${secret}`, secret)).toBe(true);
    expect(hasValidSession("landed_session", secret)).toBe(false);
  });
  it("counts only the first session cookie", () => {
    expect(hasValidSession(`landed_session=${secret}; landed_session=wrong`, secret)).toBe(true);
    expect(hasValidSession(`landed_session=wrong; landed_session=${secret}`, secret)).toBe(false);
  });
});

describe("cookieValue", () => {
  it("returns the first value of the named cookie, or null", () => {
    expect(cookieValue("a=1; b=2", "b")).toBe("2");
    expect(cookieValue("a=1; b=x=y", "b")).toBe("x=y");
    expect(cookieValue("a=1", "b")).toBeNull();
    expect(cookieValue(null, "b")).toBeNull();
  });
});
