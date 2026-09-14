/*
 * Shared shapes and helpers for Server Actions driven by useActionState. Browser-safe.
 */
import type { FieldErrors, ModuleError } from "@/modules/shared/contracts";

export type { FieldErrors };

/** Submitted string values, echoed back on error so the form keeps what was typed. */
export type FormValues = Record<string, string>;

export type ActionState =
  | { status: "idle" }
  | { status: "saved"; recordId: string }
  | { status: "error"; attempt: number; fieldErrors: FieldErrors; values: FormValues };

export const idleState: ActionState = { status: "idle" };

/** Translates a FormData submission into a plain object; listed keys become arrays. */
export function formDataToObject(
  formData: FormData,
  arrayKeys: string[] = [],
): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  for (const key of arrayKeys) object[key] = formData.getAll(key).filter((v) => v !== "");
  for (const [key, value] of formData.entries()) {
    if (arrayKeys.includes(key) || typeof value !== "string") continue;
    object[key] = value;
  }
  return object;
}

export function stringValues(formData: FormData): FormValues {
  const values: FormValues = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

export function errorState(
  previous: ActionState,
  formData: FormData,
  error: ModuleError,
): ActionState {
  const attempt = previous.status === "error" ? previous.attempt + 1 : 1;
  const fieldErrors = error.kind === "validation" ? error.fieldErrors : { form: [error.message] };
  return { status: "error", attempt, fieldErrors, values: stringValues(formData) };
}

/** A key that changes on every action result, used to remount uncontrolled fields. */
export function fieldsKey(state: ActionState): string {
  if (state.status === "saved") return `saved-${state.recordId}`;
  if (state.status === "error") return `error-${state.attempt}`;
  return "first";
}

/** Values to prefill a form with: the echoed submission on error, otherwise the stored record. */
export function prefill(state: ActionState, record: FormValues): FormValues {
  return state.status === "error" ? state.values : record;
}

export function monthLabel(year: number | null, month: number | null): string {
  if (year === null || month === null) return "";
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function dateRange(
  r: {
    startYear: number | null;
    startMonth: number | null;
    endYear: number | null;
    endMonth: number | null;
  },
  current = false,
): string {
  const start = monthLabel(r.startYear, r.startMonth);
  const end = current ? "Present" : monthLabel(r.endYear, r.endMonth);
  if (!start && !end) return "";
  if (start && end) return `${start} to ${end}`;
  return start || end;
}
