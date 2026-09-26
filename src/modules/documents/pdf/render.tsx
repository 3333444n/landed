/*
 * Renders validated content to PDF bytes. No model, no database: a pure function of the content
 * and the template version, which is why a test can assert the page count on a fixture.
 */
import { renderToBuffer } from "@react-pdf/renderer";
import type { CoverLetterContent, ResumeContent } from "../contracts";
import { CoverLetterPdf } from "./CoverLetterPdf";
import type { LetterHeader } from "../presentation";
export { letterHeaderFrom } from "../presentation";
import { ResumePdf } from "./ResumePdf";
import { templateVersion } from "./styles";

export { templateVersion };

/**
 * How far the gaps between blocks may stretch to fill the page. Above this the content is too
 * thin for one page and the remaining space stays empty; the fix is more content, not air.
 */
export const spacingBounds = { min: 1, max: 2.4 } as const;

export interface FittedResume {
  pdf: Buffer;
  /** The spacing scale that ends the content at the bottom margin, within `spacingBounds`. */
  spacing: number;
}

/**
 * Renders the resume so it ends exactly at the bottom margin: the largest spacing scale that
 * still yields one page, found by bisection over renders (react-pdf exposes no layout metrics,
 * and a render is a few tens of milliseconds). Text is never shrunk: at the base scale the
 * content schema's budgets already guarantee one page, and only the gaps grow.
 */
export async function fitResume(content: ResumeContent): Promise<FittedResume> {
  const render = async (spacing: number) =>
    Buffer.from(await renderToBuffer(<ResumePdf content={content} spacing={spacing} />));
  let low: number = spacingBounds.min;
  let best = await render(low);
  if (pdfPageCount(best) !== 1) return { pdf: best, spacing: low };
  const atMax = await render(spacingBounds.max);
  if (pdfPageCount(atMax) === 1) return { pdf: atMax, spacing: spacingBounds.max };
  let high: number = spacingBounds.max;
  while (high - low > 0.005) {
    const mid = (low + high) / 2;
    const pdf = await render(mid);
    if (pdfPageCount(pdf) === 1) {
      low = mid;
      best = pdf;
    } else {
      high = mid;
    }
  }
  return { pdf: best, spacing: low };
}

export async function renderResumePdf(content: ResumeContent): Promise<Buffer> {
  return (await fitResume(content)).pdf;
}

export async function renderCoverLetterPdf(
  content: CoverLetterContent,
  header: LetterHeader,
): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<CoverLetterPdf content={content} header={header} />));
}

/** Counts page objects; pdfkit leaves object dictionaries uncompressed, so this is reliable. */
export function pdfPageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}
