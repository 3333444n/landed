"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Field } from "@/components/Field";
import { MonthDateFields } from "@/components/MonthDateFields";
import formStyles from "@/components/forms.module.css";
import { fieldsKey, idleState, prefill, type ActionState, type FormValues } from "@/app/form-state";

/**
 * Create and edit share one form. Fields remount on every result (React resets forms after an
 * action): after a save they clear with a new record id, after an error they keep the input.
 */
export function EmploymentForm({
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
        label="Employer"
        name="employerName"
        placeholder="Example Workshop"
        defaultValue={values.employerName}
        errors={errors.employerName}
        required
      />
      <Field
        label="Role"
        name="role"
        placeholder="Software developer"
        defaultValue={values.role}
        errors={errors.role}
        required
      />
      <Field
        label="Location"
        name="location"
        placeholder="Lisbon, Portugal"
        defaultValue={values.location}
        helper="City and country, or Remote. Printed beside the role on the resume."
        errors={errors.location}
      />
      <MonthDateFields values={values} errors={errors} />
      <Checkbox
        label="I currently work here"
        name="isCurrent"
        defaultChecked={values.isCurrent === "on" || values.isCurrent === "true"}
      />
      <Field
        label="Description"
        name="description"
        multiline
        defaultValue={values.description}
        helper="What the role involved, in your own words."
        errors={errors.description}
      />
    </>
  );
}
