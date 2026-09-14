"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { MonthDateFields } from "@/components/MonthDateFields";
import { Select } from "@/components/Select";
import formStyles from "@/components/forms.module.css";
import { fieldsKey, idleState, prefill, type ActionState, type FormValues } from "@/app/form-state";

export type JobOption = { value: string; label: string };

/**
 * Create and edit share one form. Fields remount on every result (React resets forms after an
 * action): after a save they clear with a new record id, after an error they keep the input.
 * The page passes the profile's jobs so a project can be linked to one.
 */
export function ProjectForm({
  action,
  record,
  submitLabel,
  jobs,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  record?: FormValues;
  submitLabel: string;
  jobs: JobOption[];
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = prefill(state, record ?? {});

  return (
    <form action={formAction} className={formStyles.form} noValidate>
      <Fields
        key={fieldsKey(state)}
        values={values}
        errors={errors}
        editing={!!record}
        jobs={jobs}
      />
      {errors.form ? (
        <p className={`${formStyles.status} ${formStyles.failed}`} role="alert">
          {errors.form.join(" ")}
        </p>
      ) : null}
      <div className={formStyles.actions}>
        {state.status === "saved" ? (
          <span className={`${formStyles.status} ${formStyles.saved}`} role="status">
            Saved
          </span>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Fields({
  values,
  errors,
  editing,
  jobs,
}: {
  values: FormValues;
  errors: Record<string, string[]>;
  editing: boolean;
  jobs: JobOption[];
}) {
  const [recordId] = useState(() => values.id ?? crypto.randomUUID());
  return (
    <>
      {editing ? (
        <input type="hidden" name="expectedUpdatedAt" value={values.expectedUpdatedAt ?? ""} />
      ) : (
        <input type="hidden" name="id" value={recordId} />
      )}
      <Field
        label="Name"
        name="name"
        placeholder="Inventory dashboard"
        defaultValue={values.name}
        errors={errors.name}
        required
      />
      <Field
        label="Description"
        name="description"
        multiline
        defaultValue={values.description}
        helper="What you built and why."
        errors={errors.description}
      />
      <Field
        label="Link"
        name="url"
        type="url"
        inputMode="url"
        placeholder="https://"
        defaultValue={values.url}
        errors={errors.url}
      />
      <Select
        label="Part of a role"
        name="employmentId"
        options={[{ value: "", label: "Not linked to a role" }, ...jobs]}
        defaultValue={values.employmentId ?? ""}
        errors={errors.employmentId}
      />
      <MonthDateFields values={values} errors={errors} />
    </>
  );
}
