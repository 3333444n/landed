/*
 * Public surface of the Documents module. Callers import from here, never from repository or
 * schema. Client components import contracts.ts directly.
 */
export {
  contentSchemas,
  coverLetterContent,
  documentSlugs,
  documentTypeFromSlug,
  documentTypeLabels,
  documentTypes,
  editUnitInput,
  failureKinds,
  failureLabels,
  pasteBackInput,
  profileLink,
  recruiterMessageContent,
  resumeBudgets,
  resumeContent,
  resumeTotals,
  runModes,
  runStates,
  snapshot,
  warningLabels,
  type ContentUnit,
  type CoverLetterContent,
  type DocumentContent,
  type DocumentRunState,
  type DocumentType,
  type FailureKind,
  type GroundingWarning,
  type ProfileLink,
  type RecruiterMessageContent,
  type ResumeContent,
  type ResumeEntry,
  type ResumeSection,
  type RunMode,
  type Snapshot,
  type WarningKind,
} from "./contracts";
export {
  contentUnits,
  documentFacts,
  groundingCheck,
  isInterrupted,
  stableStringify,
  withUnitText,
  type DocumentFacts,
  type Unit,
} from "./rules";
export { prompts, type PromptDefinition } from "./prompts";
export {
  documentFactsForApplications,
  editUnit,
  finishRun,
  getDocumentView,
  getRun,
  listRunsForDocument,
  markReviewed,
  promptFor,
  startRun,
  submitPastedAnswer,
  sweepInterruptedRuns,
  type DocumentsDeps,
  type DocumentView,
  type RunIdentity,
} from "./service";
export { getOrRenderPdf, type RenderedArtifact } from "./artifacts";
export { pdfPageCount, templateVersion } from "./pdf";
export type {
  DocumentArtifactRecord,
  DocumentRecord,
  DocumentRevisionRecord,
  GenerationRunRecord,
} from "./repository";
