/*
 * Renders validated content to PDF bytes. No model, no database: a pure function of the content
 * and the template version, which is why a test can assert the page count on a fixture.
 */
import { renderToBuffer } from "@react-pdf/renderer";
import type { CoverLetterContent, ResumeContent, Snapshot } from "../contracts";
import { CoverLetterPdf, type LetterHeader } from "./CoverLetterPdf";
import { ResumePdf } from "./ResumePdf";
import { templateVersion } from "./styles";

export { templateVersion };

export async function renderResumePdf(content: ResumeContent): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<ResumePdf content={content} />));
}

export async function renderCoverLetterPdf(
  content: CoverLetterContent,
  header: LetterHeader,
): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<CoverLetterPdf content={content} header={header} />));
}

/** The letter header comes from the snapshot the letter was written from, never the live profile. */
export function letterHeaderFrom(snapshot: Snapshot, date: Date): LetterHeader {
  const p = snapshot.profile;
  const contact = [
    p.phone,
    p.email,
    p.location,
    ...p.links.map((l) => l.url.replace(/^https?:\/\//, "")),
  ]
    .filter((v): v is string => !!v)
    .slice(0, 6);
  return {
    name: p.displayName,
    contact,
    date: date.toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" }),
  };
}

/** Counts page objects; pdfkit leaves object dictionaries uncompressed, so this is reliable. */
export function pdfPageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}
