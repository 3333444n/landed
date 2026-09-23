import { z } from "zod";
import { checkbox, optionalText, optionalUrl, requiredText } from "@/modules/shared/contracts";

export const findingKinds = ["statement", "interpretation"] as const;
export const companyInput = z.object({
  id: z.uuid(),
  expectedUpdatedAt: z.iso.datetime().optional(),
  name: requiredText("Enter the company name"),
  location: optionalText(500),
  website: optionalUrl,
  about: optionalText(20_000),
  logoUrl: optionalUrl,
  removeLogo: checkbox.default(false),
});
export const findingInput = z.object({
  id: z.uuid(),
  expectedUpdatedAt: z.iso.datetime().optional(),
  text: requiredText("Enter the finding", 5_000),
  sourceUrl: z.url({ protocol: /^https?$/ }),
  retrievedAt: z.iso.date(),
  kind: z.enum(findingKinds),
});
export const versionInput = z.object({ expectedUpdatedAt: z.iso.datetime() });
export type CompanyInput = z.infer<typeof companyInput>;
export type FindingInput = z.infer<typeof findingInput>;

/** Image types accepted for a company logo, checked from the bytes, never from the file name. */
export const logoContentTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;
export type LogoContentType = (typeof logoContentTypes)[number];
export const logoMaxBytes = 1_048_576;
export const logoExtensions: Record<LogoContentType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/** A stored logo as the job carries it: the file's key under the artifact directory and its type. */
export interface StoredLogo {
  storageKey: string;
  contentType: LogoContentType;
}
