/*
 * DESIGN-DOCS.md as react-pdf styles: Letter, 0.5 in margins, built-in Helvetica, black on white,
 * uppercase section headings on a 2 pt rule. Values in points.
 *
 * Vertical spacing is parameterised: `resumeStyles(spacing)` multiplies every gap between
 * blocks (never a font size or a line height) so the renderer can stretch a resume until it
 * ends at the bottom margin (see `fitResume` in render.tsx). `spacing` 1 is the base scale.
 */
import { Font, StyleSheet } from "@react-pdf/renderer";

// Never break a word at a line end: a resume line is read in seconds and parsed as text.
Font.registerHyphenationCallback((word) => [word]);

export const templateVersion = 8;

/** Black on white only: no greys, so a copier or a strict parser sees one tone. */
export const colors = {
  text: "#000000",
  secondary: "#000000",
  rule: "#000000",
} as const;

/** Base gaps in points; the resume multiplies them by its spacing scale. */
export const gaps = {
  section: 10,
  afterRule: 4,
  entry: 4,
  bullets: 2,
  bullet: 1,
  summary: 4,
  skillsLine: 2,
} as const;

const page = {
  paddingTop: 36,
  paddingBottom: 36,
  paddingHorizontal: 36,
  fontFamily: "Helvetica",
  fontSize: 10,
  lineHeight: 1.25,
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
      borderBottomWidth: 2,
      borderBottomColor: colors.rule,
      marginBottom: gap(gaps.afterRule),
    },
    entry: { marginTop: gap(gaps.entry) },
    entryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    entryHeading: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
    entryDate: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    entrySub: { fontSize: 10 },
    entryLocation: { fontSize: 9, color: colors.secondary },
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
  letterPage: { ...page, paddingTop: 54, paddingBottom: 54, paddingHorizontal: 54, fontSize: 12 },
  letterhead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  letterIdentity: { flex: 1 },
  letterName: { fontSize: 32, fontFamily: "Helvetica-Bold", lineHeight: 1.1 },
  letterTitle: { fontSize: 12, marginTop: 12, fontFamily: "Helvetica" },
  letterLinks: { fontSize: 12, width: 216 },
  letterLink: { color: colors.text, textDecoration: "none" },
  letterContent: { flexGrow: 1, justifyContent: "center" },
  letterRecipient: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    marginTop: 24,
    marginBottom: 24,
    fontSize: 14,
  },
  letterTo: { flex: 1 },
  letterDate: { fontSize: 12 },
  letterStrong: { fontFamily: "Helvetica-Bold" },
  letterReference: { fontSize: 12, marginTop: 8, fontFamily: "Helvetica-Bold" },
  letterRole: { fontFamily: "Helvetica-Oblique" },
  letterFooter: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    paddingTop: 12,
    flexDirection: "row",
    gap: 24,
    fontSize: 12,
  },
  letterFooterColumn: { flex: 1 },
  letterGreeting: { marginBottom: 16 },
  letterParagraph: { marginBottom: 10 },
  letterSignature: { marginTop: 54 },
  letterSignatureName: { marginTop: 10, fontFamily: "Helvetica-Bold" },
});
