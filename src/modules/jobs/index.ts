/*
 * Public surface of the Jobs module. Callers import from here, never from repository or schema.
 */
export {
  availabilityLabels,
  jobAvailabilities,
  jobInput,
  jobSources,
  type JobAvailability,
  type JobInput,
  type JobSource,
} from "./contracts";
export { jobSummary } from "./rules";
export { deleteJob, getJob, listJobs, saveJob, type JobsDeps } from "./service";
export type { JobRecord } from "./repository";
