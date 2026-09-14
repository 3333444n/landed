/*
 * Public surface of the Applications module. Callers import from here, never from repository or
 * schema.
 */
export {
  applicationStatuses,
  createApplicationInput,
  filterLabels,
  listFilters,
  listSorts,
  runStates,
  sortLabels,
  statusLabels,
  updateApplicationInput,
  type ApplicationStatus,
  type ChipTone,
  type CreateApplicationInput,
  type DerivedJobStatus,
  type ListFilter,
  type ListSort,
  type RunState,
  type StatusChip,
  type UpdateApplicationInput,
} from "./contracts";
export {
  deriveJobStatus,
  isTerminal,
  matchesFilter,
  sortJobs,
  submittedAtAfter,
  type JobStatusFacts,
} from "./rules";
export {
  createApplication,
  getApplicationForJob,
  listApplications,
  updateApplication,
  type ApplicationsDeps,
} from "./service";
export type { ApplicationRecord } from "./repository";
