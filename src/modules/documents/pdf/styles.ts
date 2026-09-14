/*
 * DESIGN-DOCS.md as react-pdf styles: Letter, 0.6 in margins, built-in Helvetica, monochrome,
 * sentence-case headings on a 1 pt rule. Values in points.
 */
import { StyleSheet } from "@react-pdf/renderer";

export const templateVersion = 1;

export const colors = {
  text: "#111111",
  secondary: "#444444",
  rule: "#999999",
} as const;

export const styles = StyleSheet.create({
  page: {
    paddingTop: 43,
    paddingBottom: 43,
    paddingHorizontal: 43,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.3,
    color: colors.text,
  },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", lineHeight: 1.2 },
  headline: { fontSize: 10.5, marginTop: 2 },
  contact: { fontSize: 9.5, color: colors.secondary, marginTop: 2 },
  sectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    marginBottom: 4,
  },
  entry: { marginTop: 4 },
  entryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  entryHeading: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  entryDate: { fontSize: 9.5, color: colors.secondary },
  entrySub: { fontSize: 10 },
  bullets: { marginTop: 2 },
  bullet: { flexDirection: "row", marginBottom: 2 },
  bulletMark: { width: 10 },
  bulletText: { flex: 1 },
  summary: { marginTop: 8 },
  skillsLine: { marginTop: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  letterBody: { fontSize: 10.5, marginTop: 8 },
  letterParagraph: { marginBottom: 8 },
  letterMeta: { marginTop: 12, fontSize: 10 },
});
