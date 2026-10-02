import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const secret = "k3Yq9-Fv_2mWb7Lr0TzX4nHc8PjS6dAe";

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { host: "localhost:3000", ...headers },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy", () => {
  it("passes a loopback request when no session secret is set", () => {
    vi.stubEnv("LANDED_SESSION_SECRET", "");
    const response = proxy(request("/jobs"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
  it("refuses a foreign host before looking at the session", async () => {
    vi.stubEnv("LANDED_SESSION_SECRET", secret);
    const response = proxy(
      request("/jobs", { host: "evil.example", cookie: `landed_session=${secret}` }),
    );
    expect(response.status).toBe(403);
    expect(await response.text()).toMatch(/its own address/);
  });
  it("refuses pages and route handlers without the session cookie when a secret is set", async () => {
    vi.stubEnv("LANDED_SESSION_SECRET", secret);
    for (const path of ["/jobs", "/jobs/j1/resume/pdf"]) {
      const response = proxy(request(path, { cookie: "landed_session=wrong" }));
      expect(response.status).toBe(403);
      expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(await response.text()).toMatch(/its own window/);
    }
    expect(proxy(request("/jobs")).status).toBe(403);
  });
  it("passes a request carrying the session cookie", () => {
    vi.stubEnv("LANDED_SESSION_SECRET", secret);
    const response = proxy(request("/jobs", { cookie: `theme=dark; landed_session=${secret}` }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
