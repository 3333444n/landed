import { describe, expect, it } from "vitest";
import { fetchImage, isPublicAddress } from "./fetch-image";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

type Answer = { status?: number; headers?: Record<string, string>; body?: Uint8Array | null };

/** A fetch that answers by address, recording what it was asked for. */
function fakeFetch(answers: Record<string, Answer>) {
  const calls: string[] = [];
  const fetch = (async (input: URL | RequestInfo) => {
    const address = input instanceof URL ? input.toString() : String(input);
    calls.push(address);
    const answer = answers[address];
    if (!answer) throw new Error(`no answer for ${address}`);
    const body = answer.body === null ? null : (answer.body ?? png);
    return new Response(body ? new Uint8Array(body) : null, {
      status: answer.status ?? 200,
      headers: { "content-type": "image/png", ...answer.headers },
    });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

const publicHost: (host: string) => Promise<string[]> = async () => ["93.184.216.34"];
const options = (
  fetch: typeof globalThis.fetch,
  resolve: (host: string) => Promise<string[]> = publicHost,
) => ({
  maxBytes: 1024,
  fetch,
  resolve,
});

describe("fetchImage", () => {
  it("returns the bytes and type of a public image", async () => {
    const { fetch } = fakeFetch({ "https://example.com/logo.png": {} });
    const result = await fetchImage("https://example.com/logo.png", options(fetch));
    expect(result.ok && result.contentType).toBe("image/png");
    expect(result.ok && result.bytes.byteLength).toBe(png.byteLength);
  });
  it("refuses http, a bare word and a private or loopback host", async () => {
    const { fetch, calls } = fakeFetch({});
    for (const address of [
      "http://example.com/a.png",
      "not an address",
      "https://localhost/a.png",
    ]) {
      const result = await fetchImage(address, options(fetch));
      expect(result.ok).toBe(false);
    }
    const privateHost = async () => ["10.0.0.5"];
    const result = await fetchImage("https://intranet.example/a.png", options(fetch, privateHost));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toMatch(/private network/);
    expect(calls).toEqual([]);
  });
  it("refuses a literal private address and a name with one private answer among public ones", async () => {
    const { fetch, calls } = fakeFetch({});
    expect((await fetchImage("https://127.0.0.1/a.png", options(fetch))).ok).toBe(false);
    expect((await fetchImage("https://169.254.169.254/a.png", options(fetch))).ok).toBe(false);
    const mixed = async () => ["93.184.216.34", "192.168.1.1"];
    expect((await fetchImage("https://example.com/a.png", options(fetch, mixed))).ok).toBe(false);
    expect(calls).toEqual([]);
  });
  it("follows a redirect to a public host and refuses one to a private host", async () => {
    const { fetch, calls } = fakeFetch({
      "https://example.com/a": { status: 302, headers: { location: "/b.png" }, body: null },
      "https://example.com/b.png": {},
    });
    const result = await fetchImage("https://example.com/a", options(fetch));
    expect(result.ok).toBe(true);
    expect(calls).toEqual(["https://example.com/a", "https://example.com/b.png"]);

    const hop = fakeFetch({
      "https://example.com/a": {
        status: 301,
        headers: { location: "https://inside.example/b.png" },
        body: null,
      },
    });
    const resolve = async (host: string) =>
      host === "inside.example" ? ["172.16.0.9"] : ["93.184.216.34"];
    const blocked = await fetchImage("https://example.com/a", options(hop.fetch, resolve));
    expect(blocked.ok).toBe(false);
    expect(hop.calls).toEqual(["https://example.com/a"]);
  });
  it("stops after three redirects", async () => {
    const { fetch } = fakeFetch({
      "https://example.com/1": { status: 302, headers: { location: "/2" }, body: null },
      "https://example.com/2": { status: 302, headers: { location: "/3" }, body: null },
      "https://example.com/3": { status: 302, headers: { location: "/4" }, body: null },
      "https://example.com/4": { status: 302, headers: { location: "/5" }, body: null },
      "https://example.com/5": {},
    });
    const result = await fetchImage("https://example.com/1", options(fetch));
    expect(!result.ok && result.message).toMatch(/too many/);
  });
  it("refuses a body past the cap and a non-image answer", async () => {
    const big = fakeFetch({ "https://example.com/big.png": { body: new Uint8Array(2048) } });
    const tooBig = await fetchImage("https://example.com/big.png", options(big.fetch));
    expect(!tooBig.ok && tooBig.message).toMatch(/1 MB/);
    const html = fakeFetch({
      "https://example.com/page": { headers: { "content-type": "text/html; charset=utf-8" } },
    });
    const notImage = await fetchImage("https://example.com/page", options(html.fetch));
    expect(!notImage.ok && notImage.message).toMatch(/not an image/);
    const missing = fakeFetch({ "https://example.com/gone.png": { status: 404, body: null } });
    const gone = await fetchImage("https://example.com/gone.png", options(missing.fetch));
    expect(!gone.ok && gone.message).toMatch(/404/);
  });
  it("gives up at the timeout", async () => {
    const never = ((_input: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })) as typeof globalThis.fetch;
    const result = await fetchImage("https://example.com/slow.png", {
      ...options(never),
      timeoutMs: 20,
    });
    expect(!result.ok && result.message).toMatch(/too long/);
  });
});

describe("isPublicAddress", () => {
  it("classifies the reserved ranges", () => {
    for (const a of [
      "127.0.0.1",
      "10.1.2.3",
      "172.31.0.1",
      "192.168.0.1",
      "169.254.1.1",
      "0.0.0.0",
      "100.64.0.1",
      "224.0.0.1",
      "::1",
      "fe80::1",
      "fd00::1",
      "::ffff:10.0.0.1",
    ]) {
      expect(isPublicAddress(a), a).toBe(false);
    }
    for (const a of [
      "93.184.216.34",
      "8.8.8.8",
      "172.32.0.1",
      "2606:2800:220:1:248:1893:25c8:1946",
      "::ffff:93.184.216.34",
    ]) {
      expect(isPublicAddress(a), a).toBe(true);
    }
  });
});
