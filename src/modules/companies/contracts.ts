import { z } from "zod";
import { optionalText, optionalUrl, requiredText } from "@/modules/shared/contracts";

export const findingKinds = ["statement", "interpretation"] as const;
export const companyInput = z.object({
  id: z.uuid(),
  expectedUpdatedAt: z.iso.datetime().optional(),
  name: requiredText("Enter the company name"),
  location: optionalText(500),
  website: optionalUrl,
  about: optionalText(20_000),
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
