import { describe, expect, it } from "vitest";
import { detectImageType, jobSummary, logoHref, logoVersion } from "./rules";

describe("jobSummary", () => {
  it("takes the first non-empty line, trimmed", () => {
    expect(jobSummary("\n\n  We are hiring a developer.  \nMore text")).toBe(
      "We are hiring a developer.",
    );
  });
  it("is empty for blank text", () => {
    expect(jobSummary("  \n \n")).toBe("");
  });
  it("shortens a long line with an ellipsis", () => {
    const summary = jobSummary("a".repeat(200));
    expect(summary).toHaveLength(140);
    expect(summary.endsWith("…")).toBe(true);
  });
});

describe("detectImageType", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0]);
  const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBPVP8 ")]);
  it("reads PNG, JPEG and WebP from their magic numbers", () => {
    expect(detectImageType(png)).toBe("image/png");
    expect(detectImageType(jpeg)).toBe("image/jpeg");
    expect(detectImageType(webp)).toBe("image/webp");
  });
  it("reads SVG from its root element, with or without a prolog", () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe(
      "image/svg+xml",
    );
    expect(
      detectImageType(
        Buffer.from('﻿<?xml version="1.0"?>\n<!-- logo -->\n<svg viewBox="0 0 1 1"/>'),
      ),
    ).toBe("image/svg+xml");
  });
  it("refuses text, HTML and short or empty input, whatever the file name said", () => {
    expect(detectImageType(Buffer.from("<html><body>not an image</body></html>"))).toBeNull();
    expect(detectImageType(Buffer.from("just some words that are long enough"))).toBeNull();
    expect(detectImageType(new Uint8Array([0x89, 0x50]))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

describe("logo address", () => {
  const job = { id: "70000000-0000-4000-8000-000000000001", logoStorageKey: null as string | null };
  it("is null without a logo", () => {
    expect(logoHref(job)).toBeNull();
  });
  it("carries the content hash from the storage key", () => {
    const key = `10000000-0000-4000-8000-000000000001/logos/${job.id}-0badf00d.png`;
    expect(logoVersion(key)).toBe("0badf00d");
    expect(logoHref({ ...job, logoStorageKey: key })).toBe(`/jobs/${job.id}/logo?k=0badf00d`);
  });
});
