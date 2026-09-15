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
export { detectImageType, jobSummary, logoHref, logoVersion } from "./rules";
export { deleteJob, getJob, listJobs, saveJob, type JobsDeps, type LogoChange } from "./service";
export type { JobRecord } from "./repository";
