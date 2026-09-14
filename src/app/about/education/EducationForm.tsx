"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { MonthDateFields } from "@/components/MonthDateFields";
import { Select } from "@/components/Select";
import formStyles from "@/components/forms.module.css";
import { fieldsKey, idleState, prefill, type ActionState, type FormValues } from "@/app/form-state";

const statusOptions = [
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "incomplete", label: "Incomplete" },
];

/**
 * Create and edit share one form. Fields remount on every result (React resets forms after an
 * action): after a save they clear with a new record id, after an error they keep the input.
 */
export function EducationForm({
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
    <form action={formAction} className={formStyles.form} noValidate>
      <Fields key={fieldsKey(state)} values={values} errors={errors} editing={!!record} />
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
        label="Institution"
        name="institution"
        placeholder="Example University"
        defaultValue={values.institution}
        errors={errors.institution}
        required
      />
      <Field
        label="Qualification"
        name="qualification"
        helper="Degree, certificate or programme"
        defaultValue={values.qualification}
        errors={errors.qualification}
      />
      <Field label="Subject" name="subject" defaultValue={values.subject} errors={errors.subject} />
      <MonthDateFields values={values} errors={errors} />
      <Select
        label="Status"
        name="status"
        options={statusOptions}
        defaultValue={values.status || "completed"}
        errors={errors.status}
      />
      <Field
        label="Description"
        name="description"
        multiline
        defaultValue={values.description}
        errors={errors.description}
      />
    </>
  );
}
