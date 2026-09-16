/*
 * Glyph advance widths of the PDF's built-in Helvetica and Helvetica-Bold (Adobe core 14 AFM
 * metrics, in 1/1000 em, ASCII 32 to 126), so a rule can know how wide a line of the resume will
 * print without rendering it. Browser-safe and pure: the review view could use it too.
 */

const regular = [
  278, 278, 355, 556, 556, 889, 667, 222, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 222, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const bold = [
  278, 333, 474, 556, 556, 889, 722, 278, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
  611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 333, 278, 333, 584, 556, 278, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
  278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

/** Accented Latin letters and the dashes are as wide as their base letter; anything else is guessed. */
const fallback = 556;

export type Face = "regular" | "bold";

function advance(char: string, face: Face): number {
  const code = char.codePointAt(0) ?? 0;
  const base = code - 32;
  const table = face === "bold" ? bold : regular;
  if (base >= 0 && base < table.length) return table[base]!;
  const stripped = char.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (stripped !== char && stripped.length === 1) return advance(stripped, face);
  return fallback;
}

/** Printed width of `text` in points at `size`, before any line breaking. */
export function textWidth(text: string, size: number, face: Face = "regular"): number {
  let width = 0;
  for (const char of text) width += advance(char, face);
  return (width * size) / 1000;
}

/** Lines a paragraph takes under greedy word wrapping, which is what the renderer does. */
export function lineCount(
  text: string,
  lineWidth: number,
  size: number,
  face: Face = "regular",
): number {
  const space = textWidth(" ", size, face);
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const w = textWidth(word, size, face);
    if (used === 0) used = w;
    else if (used + space + w <= lineWidth) used += space + w;
    else {
      lines += 1;
      used = w;
    }
  }
  return lines;
}
