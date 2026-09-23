import { detectImageType, logoVersion, logoHref } from "@/modules/companies";
import { describe, expect, it } from "vitest";
import {
  buildWordCloud,
  centerOut,
  jobSummary,
  sizeStep,
  skillWords,
  wordFrequencies,
} from "./rules";

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
    expect(logoHref({ ...job, logoStorageKey: key })).toBe(`/companies/${job.id}/logo?k=0badf00d`);
  });
});

describe("wordFrequencies", () => {
  it("drops stopwords in English and Spanish, digits and short tokens", () => {
    const words = wordFrequencies("We are the team y el equipo de 2024 ok go go").map(
      (w) => w.word,
    );
    expect(words).toEqual(["equipo", "team"]);
  });
  it("keeps accented words and orders ties alphabetically", () => {
    const words = wordFrequencies("diseño zeta alpha diseño zeta alpha").map((w) => w.word);
    expect(words).toEqual(["alpha", "diseño", "zeta"]);
  });
  it("keeps c++, and c# when it is a skill", () => {
    expect(wordFrequencies("c++ and c# developers").map((w) => w.word)).toEqual([
      "c++",
      "developers",
    ]);
    expect(
      wordFrequencies("c++ and c# developers", { keep: new Set(["c#"]) }).map((w) => w.word),
    ).toEqual(["c#", "c++", "developers"]);
  });
  it("respects the limit and counts", () => {
    const result = wordFrequencies("apple apple apple pear pear plum", { limit: 2 });
    expect(result).toEqual([
      { word: "apple", count: 3 },
      { word: "pear", count: 2 },
    ]);
  });
  it("keeps a short token when it is an exact skill", () => {
    const words = wordFrequencies("we write go and r daily", { keep: new Set(["go"]) });
    expect(words.map((w) => w.word)).toEqual(["daily", "go", "write"]);
  });
});

describe("sizeStep", () => {
  it("spans 1 to 4 and gives equal counts the second step", () => {
    expect(sizeStep(1, 1, 10)).toBe(1);
    expect(sizeStep(10, 1, 10)).toBe(4);
    expect(sizeStep(5, 1, 10)).toBe(2);
    expect(sizeStep(3, 3, 3)).toBe(2);
  });
});

describe("centerOut", () => {
  it("puts the first item in the middle and alternates sides", () => {
    expect(centerOut([1])).toEqual([1]);
    expect(centerOut([1, 2])).toEqual([1, 2]);
    expect(centerOut([1, 2, 3, 4, 5])).toEqual([5, 3, 1, 2, 4]);
  });
});

describe("skillWords", () => {
  const skills = [{ normalizedName: "react native" }, { normalizedName: "postgresql" }];
  it("matches a one-word skill and every word of a multi-word skill that is fully present", () => {
    expect([...skillWords(skills, "React Native apps on PostgreSQL")]).toEqual([
      "react",
      "native",
      "postgresql",
    ]);
  });
  it("does not highlight a fragment of a multi-word skill", () => {
    expect([...skillWords(skills, "native speakers wanted")]).toEqual([]);
  });
});

describe("buildWordCloud", () => {
  it("is empty below three words", () => {
    expect(buildWordCloud("hello hello", [])).toEqual([]);
  });
  it("marks matches, sizes by count and centers the most frequent word", () => {
    const cloud = buildWordCloud("postgresql postgresql postgresql typescript typescript testing", [
      { normalizedName: "postgresql" },
    ]);
    expect(cloud.map((c) => c.word)).toEqual(["testing", "postgresql", "typescript"]);
    expect(cloud[1]).toMatchObject({ count: 3, step: 4, matched: true });
    expect(cloud[0]).toMatchObject({ count: 1, step: 1, matched: false });
  });
});
