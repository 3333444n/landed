"use client";

import { useActionState, useState } from "react";
import type { ActionState, FormValues } from "@/app/actions";
import type { FieldErrors } from "@/modules/profile";
import { Button } from "./Button";
import { Field } from "./Field";
import styles from "./forms.module.css";

const initial: ActionState = { status: "idle" };

/**
 * The server action is passed straight to useActionState so a submission before hydration still
 * works as a plain form post. React resets a form after every action, so the fields remount on
 * each result: after a save they come back empty with a new record id; after an error they come
 * back with the submitted values and the same record id.
 */
export function AchievementForm({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};
  const fieldsKey =
    state.status === "saved"
      ? `saved-${state.recordId}`
      : state.status === "error"
        ? `error-${state.attempt}`
        : "first";

  return (
    <form action={formAction} className={styles.form} noValidate>
      <AchievementFields key={fieldsKey} errors={errors} values={values} />
      {errors.form ? (
        <p className={`${styles.status} ${styles.failed}`} role="alert">
          {errors.form.join(" ")}
        </p>
      ) : null}
      <div className={styles.actions}>
        {state.status === "saved" ? (
          <span className={`${styles.status} ${styles.saved}`} role="status">
            Saved
          </span>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save achievement"}
        </Button>
      </div>
    </form>
  );
}

function AchievementFields({ errors, values }: { errors: FieldErrors; values: FormValues }) {
  // Generated once per blank form and kept across errors: a retry after a lost response saves
  // the same record instead of a duplicate (docs/05).
  const [recordId] = useState<string>(() => values.id ?? crypto.randomUUID());
  return (
    <>
      <input type="hidden" name="id" value={recordId} />
      <Field
        label="Statement"
        name="statement"
        multiline
        defaultValue={values.statement}
        placeholder="One factual sentence about what you did and what it changed"
        errors={errors.statement}
        required
      />
      <Field
        label="Metric"
        name="metric"
        defaultValue={values.metric}
        helper="Only if you measured it. A number is never required."
        errors={errors.metric}
      />
      <Field
        label="Source note"
        name="sourceNote"
        defaultValue={values.sourceNote}
        helper="Where this fact comes from: a review, a report, your own recollection."
        errors={errors.sourceNote}
      />
      <Field
        label="Source link"
        name="sourceUrl"
        defaultValue={values.sourceUrl}
        type="url"
        inputMode="url"
        placeholder="https://"
        errors={errors.sourceUrl}
      />
    </>
  );
}
