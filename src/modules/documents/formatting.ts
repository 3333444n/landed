import type { z } from "zod";
import type {
  CoverLetterContent,
  DocumentContent,
  DocumentType,
  ResumeContent,
  TextSegment,
} from "./contracts";
import { editableFields } from "./editable-fields";
import { textWidth } from "./helvetica";

export function normalizeSegments(segments: TextSegment[]): TextSegment[] {
  const result: TextSegment[] = [];
  for (const segment of segments) {
    if (!segment.text) continue;
    const marks = (["bold", "italic", "underline"] as const).filter((mark) =>
      segment.marks.includes(mark),
    );
    const previous = result.at(-1);
    if (previous && previous.marks.join() === marks.join()) previous.text += segment.text;
    else result.push({ text: segment.text, marks });
  }
  return result;
}

/** Trim only the overall field boundaries, retaining interior spaces and their marks. */
export function trimSegments(segments: TextSegment[]): TextSegment[] {
  const text = segments.map((segment) => segment.text).join("");
  const start = text.length - text.trimStart().length;
  const end = text.trimEnd().length;
  let offset = 0;
  return normalizeSegments(
    segments.flatMap((segment) => {
      const segmentStart = offset;
      offset += segment.text.length;
      const from = Math.max(start - segmentStart, 0);
      const to = Math.min(end - segmentStart, segment.text.length);
      return to > from ? [{ text: segment.text.slice(from, to), marks: [...segment.marks] }] : [];
    }),
  );
}

export function formattingSegments(
  content: DocumentContent,
  path: string,
  text: string,
): TextSegment[] {
  const formatting = "formatting" in content ? content.formatting : undefined;
  const segments = formatting?.find((entry) => entry.path === path)?.segments;
  return segments && segments.map((s) => s.text).join("") === text
    ? segments
    : [{ text, marks: [] }];
}

/** Display punctuation is not saved and does not discard emphasis on the salutation. */
export function salutationFormattingSegments(
  content: DocumentContent,
  path: string,
  text: string,
): TextSegment[] {
  const segments = trimSegments(formattingSegments(content, path, text));
  let remaining = text.trim().replace(/(?:,\s*)+$/, "").length;
  const result = segments.flatMap((segment) => {
    const displayed = segment.text.slice(0, remaining);
    remaining = Math.max(0, remaining - segment.text.length);
    return displayed ? [{ text: displayed, marks: segment.marks }] : [];
  });
  return normalizeSegments([...result, { text: ",", marks: [] }]);
}

export function withFieldFormatting<T extends DocumentContent>(
  content: T,
  path: string,
  segments: TextSegment[],
): T {
  const copy = structuredClone(content) as T & {
    formatting?: { path: string; segments: TextSegment[] }[];
  };
  const normalized = normalizeSegments(segments);
  copy.formatting = (copy.formatting ?? []).filter((entry) => entry.path !== path);
  if (normalized.some((segment) => segment.marks.length))
    copy.formatting.push({ path, segments: normalized });
  return copy;
}

export function validateFormatting(
  type: DocumentType,
  content: ResumeContent | CoverLetterContent,
  ctx: z.RefinementCtx,
) {
  const fields = new Map(editableFields(type, content).map((field) => [field.path, field.text]));
  const seen = new Set<string>();
  content.formatting?.forEach((entry, i) => {
    if (seen.has(entry.path) || !fields.has(entry.path))
      ctx.addIssue({
        code: "custom",
        path: ["formatting", i, "path"],
        message: "Formatting must target a unique editable field",
      });
    seen.add(entry.path);
    if (entry.segments.map((segment) => segment.text).join("") !== fields.get(entry.path))
      ctx.addIssue({
        code: "custom",
        path: ["formatting", i, "segments"],
        message: "Formatted text must exactly match the field text",
      });
    entry.segments = normalizeSegments(entry.segments);
  });
}

/** Helvetica oblique faces have the same advance widths as their upright counterparts. */
export function segmentsWidth(segments: TextSegment[], size: number, baseBold = false): number {
  return segments.reduce(
    (sum, segment) =>
      sum +
      textWidth(
        segment.text,
        size,
        baseBold || segment.marks.includes("bold") ? "bold" : "regular",
      ),
    0,
  );
}

export function segmentsLineCount(
  segments: TextSegment[],
  width: number,
  size: number,
  baseBold = false,
): number {
  let lines = 1;
  let used = 0;
  let word = 0;
  let space = 0;
  const flush = () => {
    if (!word) return;
    if (used && used + space + word > width) {
      lines++;
      used = word;
    } else used += (used ? space : 0) + word;
    word = 0;
    space = 0;
  };
  let previousWasCarriageReturn = false;
  for (const segment of segments) {
    for (const char of segment.text) {
      if (char === "\r" || char === "\n") {
        if (!(char === "\n" && previousWasCarriageReturn)) {
          flush();
          lines++;
          used = 0;
          space = 0;
        }
        previousWasCarriageReturn = char === "\r";
        continue;
      }
      previousWasCarriageReturn = false;
      const advance = textWidth(
        char,
        size,
        baseBold || segment.marks.includes("bold") ? "bold" : "regular",
      );
      if (/\s/u.test(char)) {
        flush();
        space += advance;
      } else word += advance;
    }
  }
  flush();
  return lines;
}
