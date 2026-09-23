export {
  companyInput,
  findingInput,
  findingKinds,
  versionInput,
  type CompanyInput,
  type FindingInput,
} from "./contracts";
export { findingKindLabel } from "./rules";
export * from "./service";
export type { CompanyRecord, CompanyFindingRecord } from "./repository";

export {
  logoContentTypes,
  logoMaxBytes,
  logoExtensions,
  type LogoContentType,
  type StoredLogo,
} from "./contracts";
export { storeLogo, readLogo, logoFieldErrors } from "./logo";
export { detectImageType, logoHref, logoVersion } from "./rules";
