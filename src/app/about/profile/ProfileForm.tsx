"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Field } from "@/components/Field";
import fieldStyles from "@/components/Field.module.css";
import formStyles from "@/components/forms.module.css";
import { fieldsKey, idleState, prefill, type ActionState, type FormValues } from "@/app/form-state";
// From contracts, not the module index: the index re-exports the service, which pulls in pg.
import { workArrangements } from "@/modules/profile/contracts";
import styles from "./ProfileForm.module.css";

const arrangementLabels: Record<(typeof workArrangements)[number], string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On site",
};

/**
 * Edits the one profile in place. Fields remount on every result (React resets forms after an
 * action): after an error they keep the input, after a save they show the stored record, which
 * the page re-renders with the new values because the action revalidates it.
 */
export function ProfileForm({
  action,
  record,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Stored values as strings; workArrangement is the comma-joined selection. */
  record: FormValues;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = prefill(state, record);
  // The record id never changes here, so the saved key alone would not remount after a second
  // save. The stored updatedAt changes on every save, so it is part of the key.
  const key = `${fieldsKey(state)}-${record.expectedUpdatedAt ?? ""}`;

  return (
    <form action={formAction} className={formStyles.form} noValidate>
      <Fields key={key} values={values} errors={errors} record={record} />
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
          {pending ? "Saving" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function Fields({
  values,
  errors,
  record,
}: {
  values: FormValues;
  errors: Record<string, string[]>;
  record: FormValues;
}) {
  // FormValues keeps only the last string per key, so a multi-value checkbox group cannot be read
  // back from the echoed submission. After an error the checkboxes show the stored selection.
  const checked = new Set((record.workArrangement ?? "").split(",").filter(Boolean));
  return (
    <>
      <input type="hidden" name="expectedUpdatedAt" value={values.expectedUpdatedAt ?? ""} />
      <Field
        label="Your name"
        name="displayName"
        autoComplete="name"
        defaultValue={values.displayName}
        errors={errors.displayName}
        required
      />
      <Field
        label="Headline"
        name="headline"
        helper="One line, such as Software developer"
        defaultValue={values.headline}
        errors={errors.headline}
      />
      <Field
        label="Summary"
        name="summary"
        multiline
        defaultValue={values.summary}
        errors={errors.summary}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={values.email}
        errors={errors.email}
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={values.phone}
        errors={errors.phone}
      />
      <Field
        label="Location"
        name="location"
        defaultValue={values.location}
        errors={errors.location}
      />
      <Field
        label="Desired roles"
        name="desiredRoles"
        helper="Separate several with commas"
        defaultValue={values.desiredRoles}
        errors={errors.desiredRoles}
      />
      <Field
        label="Locations you would work in"
        name="locations"
        helper="Separate several with commas"
        defaultValue={values.locations}
        errors={errors.locations}
      />
      <fieldset className={styles.group}>
        <legend className={`${fieldStyles.label} ${styles.legend}`}>Work arrangement</legend>
        <div className={styles.options}>
          {workArrangements.map((value) => (
            <Checkbox
              key={value}
              name="workArrangement"
              value={value}
              label={arrangementLabels[value]}
              defaultChecked={checked.has(value)}
            />
          ))}
        </div>
        {errors.workArrangement ? (
          <p className={fieldStyles.error} role="alert">
            {errors.workArrangement.join(" ")}
          </p>
        ) : null}
      </fieldset>
      <Field
        label="Constraints"
        name="constraints"
        multiline
        helper="Visa, notice period, hours, anything a recruiter should know"
        defaultValue={values.constraints}
        errors={errors.constraints}
      />
    </>
  );
}
