/*
 * Public surface of the Jobs module. Callers import from here, never from repository or schema.
 */
export {
  availabilityLabels,
  jobAvailabilities,
  jobInput,
  jobSources,
  logoContentTypes,
  logoMaxBytes,
  type JobAvailability,
  type JobInput,
  type JobSource,
  type LogoContentType,
  type StoredLogo,
} from "./contracts";
export { logoFieldErrors, readLogo, storeLogo } from "./logo";
export {
  buildWordCloud,
  centerOut,
  detectImageType,
  jobSummary,
  logoHref,
  logoVersion,
  sizeStep,
  skillWords,
  tokenize,
  wordFrequencies,
  type SkillLike,
  type WordCloudItem,
  type WordCount,
} from "./rules";
export { deleteJob, getJob, listJobs, saveJob, type JobsDeps, type LogoChange } from "./service";
export type { JobRecord } from "./repository";

export { createJobSourceInput, updateJobSourceInput, updateJobSourceLinkInput } from "./contracts";
export {
  listJobSources,
  getJobSource,
  createJobSource,
  updateJobSource,
  updateJobSourceLink,
} from "./service";
export type { JobSourceRecord } from "./repository";
export {
  updateJobCompany,
  setJobFindingSelection,
  getSelectedFindingIds,
  invalidateJobsForFinding,
} from "./service";

export { lockJobFindingContext } from "./service";
