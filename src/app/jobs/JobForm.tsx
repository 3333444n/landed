"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import formStyles from "@/components/forms.module.css";
import { fieldsKey, idleState, prefill, type ActionState, type FormValues } from "@/app/form-state";
import { availabilityLabels, jobAvailabilities } from "@/modules/jobs/contracts";

/**
 * Paste and edit share one form. Fields remount on every result (React resets forms after an
 * action): after a save they clear with a new record id, after an error they keep the input.
 */
/** The logo picker in the column header binds its inputs to the form through this id. */
export const jobFormId = "job-form";

export function JobForm({
  action,
  record,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  record?: FormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = prefill(state, record ?? {});

  return (
    <form id={jobFormId} action={formAction} className={formStyles.form} noValidate>
      <Fields key={fieldsKey(state)} values={values} errors={errors} editing={!!record} />
      {errors.logoFile || errors.logoUrl ? (
        <p className={`${formStyles.status} ${formStyles.failed}`} role="alert">
          Logo: {[...(errors.logoFile ?? []), ...(errors.logoUrl ?? [])].join(" ")}. Choose it again
          from the tile next to the title.
        </p>
      ) : null}
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
}: {
  values: FormValues;
  errors: Record<string, string[]>;
  editing: boolean;
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
        label="Title"
        name="title"
        placeholder="Full-stack developer"
        defaultValue={values.title}
        errors={errors.title}
        required
      />
      <Field
        label="Company"
        name="companyName"
        defaultValue={values.companyName}
        errors={errors.companyName}
        required
      />
      <Field
        label="Location"
        name="location"
        helper="City, country or remote. Optional."
        defaultValue={values.location}
        errors={errors.location}
      />
      <Field
        label="Salary"
        name="salary"
        helper="As the posting states it, any currency or period. Optional."
        defaultValue={values.salary}
        errors={errors.salary}
      />
      <Field
        label="Posting URL"
        name="sourceUrl"
        type="url"
        inputMode="url"
        placeholder="https://"
        defaultValue={values.sourceUrl}
        errors={errors.sourceUrl}
      />
      <Field
        label="Description"
        name="rawDescription"
        multiline
        rows={14}
        helper="Paste the posting as it is. It is kept as data, never followed as instructions."
        defaultValue={values.rawDescription}
        errors={errors.rawDescription}
        required
      />
      {editing ? (
        <Select
          label="Availability"
          name="availability"
          defaultValue={values.availability ?? "active"}
          options={jobAvailabilities.map((value) => ({ value, label: availabilityLabels[value] }))}
          helper="Whether the posting is still open. It never changes your application's status."
          errors={errors.availability}
        />
      ) : null}
    </>
  );
}
