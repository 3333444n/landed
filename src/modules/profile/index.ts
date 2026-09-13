/*
 * Public surface of the Profile module. Callers import from here, never from repository or schema.
 */
export {
  createAchievementInput,
  createProfileInput,
  fieldErrorsFromZod,
  type CreateAchievementInput,
  type CreateProfileInput,
  type FieldErrors,
  type ProfileError,
  type Result,
} from "./contracts";
export {
  createAchievement,
  createProfile,
  getCurrentProfile,
  listAchievements,
  type AchievementWithSkills,
  type ProfileDeps,
} from "./service";
export type { AchievementRecord, ProfileRecord, SkillRecord } from "./repository";
