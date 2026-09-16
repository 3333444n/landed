/*
 * DESIGN-DOCS.md as react-pdf styles: Letter, 0.6 in margins, built-in Helvetica, monochrome,
 * uppercase section headings on a 1.5 pt rule. Values in points.
 *
 * Vertical spacing is parameterised: `resumeStyles(spacing)` multiplies every gap between
 * blocks (never a font size or a line height) so the renderer can stretch a resume until it
 * ends at the bottom margin (see `fitResume` in render.tsx). `spacing` 1 is the base scale.
 */
import { Font, StyleSheet } from "@react-pdf/renderer";

// Never break a word at a line end: a resume line is read in seconds and parsed as text.
Font.registerHyphenationCallback((word) => [word]);

export const templateVersion = 2;

export const colors = {
  text: "#111111",
  secondary: "#444444",
  rule: "#999999",
} as const;

/** Base gaps in points; the resume multiplies them by its spacing scale. */
export const gaps = {
  section: 12,
  afterRule: 4,
  entry: 5,
  bullets: 2,
  bullet: 2,
  summary: 4,
  skillsLine: 2,
} as const;

const page = {
  paddingTop: 43,
  paddingBottom: 43,
  paddingHorizontal: 43,
  fontFamily: "Helvetica",
  fontSize: 10,
  lineHeight: 1.3,
  color: colors.text,
} as const;

const header = {
  name: { fontSize: 24, fontFamily: "Helvetica-Bold", lineHeight: 1.15 },
  headline: { fontSize: 10.5, marginTop: 2 },
  contact: { fontSize: 9.5, color: colors.secondary, marginTop: 2 },
} as const;

export function resumeStyles(spacing: number) {
  const gap = (base: number) => Math.round(base * spacing * 100) / 100;
  return StyleSheet.create({
    page,
    ...header,
    sectionHeading: {
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      marginTop: gap(gaps.section),
      paddingBottom: 2,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.rule,
      marginBottom: gap(gaps.afterRule),
    },
    entry: { marginTop: gap(gaps.entry) },
    entryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    entryHeading: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
    entryDate: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    entrySub: { fontSize: 10 },
    bullets: { marginTop: gap(gaps.bullets) },
    bullet: { flexDirection: "row", marginBottom: gap(gaps.bullet) },
    bulletMark: { width: 10 },
    bulletText: { flex: 1 },
    summary: { marginTop: gap(gaps.summary) },
    skillsLine: { marginTop: gap(gaps.skillsLine) },
    bold: { fontFamily: "Helvetica-Bold" },
  });
}

export const styles = StyleSheet.create({
  page,
  ...header,
  letterBody: { fontSize: 10.5, marginTop: 8 },
  letterParagraph: { marginBottom: 8 },
  letterMeta: { marginTop: 12, fontSize: 10 },
});
