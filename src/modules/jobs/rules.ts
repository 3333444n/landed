/*
 * Pure rules for postings. No database, no framework.
 */
import type { LogoContentType } from "./contracts";
import { stopwords } from "./stopwords";

/** The first non-empty line of a pasted description, trimmed to fit a card's metadata line. */
export function jobSummary(rawDescription: string, max = 140): string {
  const line = rawDescription
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/**
 * The type of an uploaded or fetched image from its bytes (docs/04): PNG, JPEG and WebP by their
 * magic numbers, SVG by its root element. Anything else is refused, whatever its name says.
 */
export function detectImageType(bytes: Uint8Array): LogoContentType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, 1024))
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(head)) {
    return "image/svg+xml";
  }
  return null;
}

function ascii(bytes: Uint8Array, from: number, to: number): string {
  return String.fromCharCode(...bytes.subarray(from, to));
}

/** The short content hash inside a logo's storage key, used as the address's cache breaker. */
export function logoVersion(storageKey: string): string | null {
  const match = /-([0-9a-f]{8})\.[a-z]+$/.exec(storageKey);
  return match?.[1] ?? null;
}

/** The address the interface loads a job's logo from, or null when the job has none. */
export function logoHref(job: { id: string; logoStorageKey: string | null }): string | null {
  if (!job.logoStorageKey) return null;
  const version = logoVersion(job.logoStorageKey);
  return version ? `/jobs/${job.id}/logo?k=${version}` : null;
}

/* Word cloud (docs/01): plain frequencies over the posting, tinted where a word is a skill. */
export interface WordCount {
  word: string;
  count: number;
}

export interface WordCloudItem extends WordCount {
  /** 1 (least frequent) to 4 (most frequent). */
  step: 1 | 2 | 3 | 4;
  /** The word is one of the profile's skills. */
  matched: boolean;
}

/** Skills arrive as plain data (Profile's normalized names), so Jobs imports no Profile code. */
export interface SkillLike {
  normalizedName: string;
}

const tokenPattern = /\p{L}[\p{L}+#]*/gu;
const minimumLength = 3;

/** Lowercase word tokens; letters plus the "+" and "#" of names such as c++ and c#. */
export function tokenize(text: string): string[] {
  return text.toLowerCase().match(tokenPattern) ?? [];
}

/**
 * Counts the words worth showing: stopwords, digits and tokens shorter than three letters are
 * dropped unless the token is exactly a single-word skill. Ties are ordered alphabetically.
 */
export function wordFrequencies(
  text: string,
  options: { limit?: number; keep?: ReadonlySet<string> } = {},
): WordCount[] {
  const { limit = 40, keep = new Set<string>() } = options;
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    const kept = keep.has(token);
    if (!kept && (token.length < minimumLength || stopwords.has(token))) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit);
}

/** 1 to 4, linear between the smallest and the largest count; equal counts all sit at 2. */
export function sizeStep(count: number, min: number, max: number): 1 | 2 | 3 | 4 {
  if (max <= min) return 2;
  const step = 1 + Math.round((3 * (count - min)) / (max - min));
  return Math.min(4, Math.max(1, step)) as 1 | 2 | 3 | 4;
}

/**
 * Reorders a list sorted by importance so the first item sits in the middle and the rest alternate
 * right and left of it. In a centered wrapping row the important words then land in the middle.
 */
export function centerOut<T>(items: readonly T[]): T[] {
  const left: T[] = [];
  const right: T[] = [];
  items.forEach((item, index) => {
    if (index === 0) right.push(item);
    else if (index % 2 === 1) right.push(item);
    else left.unshift(item);
  });
  return [...left, ...right];
}

/**
 * The words a skill list highlights in a text: a one-word skill matches its word; a multi-word
 * skill highlights each of its words only when every one of them appears in the text.
 */
export function skillWords(skills: readonly SkillLike[], text: string): Set<string> {
  const present = new Set(tokenize(text));
  const words = new Set<string>();
  for (const skill of skills) {
    const tokens = tokenize(skill.normalizedName);
    if (tokens.length === 0) continue;
    if (tokens.every((token) => present.has(token))) tokens.forEach((token) => words.add(token));
  }
  return words;
}

/** The finished cloud for one posting, center-ordered; empty when fewer than three words remain. */
export function buildWordCloud(
  text: string,
  skills: readonly SkillLike[],
  limit = 40,
): WordCloudItem[] {
  const matches = skillWords(skills, text);
  const singleWordSkills = new Set<string>();
  for (const skill of skills) {
    const tokens = tokenize(skill.normalizedName);
    if (tokens.length === 1) singleWordSkills.add(tokens[0]!);
  }
  const counts = wordFrequencies(text, { limit, keep: singleWordSkills });
  if (counts.length < 3) return [];
  const values = counts.map((c) => c.count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return centerOut(
    counts.map((c) => ({ ...c, step: sizeStep(c.count, min, max), matched: matches.has(c.word) })),
  );
}
