import { factsBlock, groundingRules, type PromptDefinition } from "./shared";

export const coverLetterPrompt: PromptDefinition = {
  name: "cover-letter",
  version: 2,
  instructions: `You write a one-page cover letter for one job posting from a candidate's own career facts.

${groundingRules}

Shape:
- "greeting": "Dear hiring team" unless the posting names a person or a team.
- "paragraphs": 2 to 4 paragraphs of at most 700 characters each, every one with evidenceIds. The first says which role and why it interests the candidate in terms the posting uses; the middle ones connect one or two concrete facts to the posting's needs; the last is a short close with availability only if the facts state it.
- "closing": for example "Kind regards".
- "signature": the candidate's name.
- Plain, specific, no flattery, no claims about the company that the posting does not state.`,
  buildInput: factsBlock,
};
