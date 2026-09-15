import type { DocumentType } from "../contracts";
import { coverLetterPrompt } from "./cover-letter";
import { recruiterMessagePrompt } from "./recruiter-message";
import { resumePrompt } from "./resume";
import type { PromptDefinition } from "./shared";

export type { PromptDefinition } from "./shared";

export const prompts: Record<DocumentType, PromptDefinition> = {
  resume: resumePrompt,
  cover_letter: coverLetterPrompt,
  recruiter_message: recruiterMessagePrompt,
};
