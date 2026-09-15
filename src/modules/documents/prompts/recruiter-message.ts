import { factsBlock, groundingRules, type PromptDefinition } from "./shared";

export const recruiterMessagePrompt: PromptDefinition = {
  name: "recruiter-message",
  version: 2,
  instructions: `You write a short first message from a candidate to the recruiter or hiring manager for one job posting, from the candidate's own career facts.

${groundingRules}

Shape:
- "variant": "email".
- "subject": at most 90 characters naming the role.
- "body": at most 900 characters, three short paragraphs at most: why this role, the one or two facts that matter most for it, and a plain ask for a conversation. Sign with the candidate's name. No links unless they are in the profile.
- "evidenceIds": the records the body draws on.`,
  buildInput: factsBlock,
};
