"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { Button } from "./Button";
import { Field } from "./Field";
import styles from "./forms.module.css";

const initial: ActionState = { status: "idle" };

export function ProfileNameForm({
  action,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};
  const fieldsKey = state.status === "error" ? `error-${state.attempt}` : "first";

  return (
    <form action={formAction} className={styles.form} noValidate>
      <Field
        key={fieldsKey}
        label="Your name"
        name="displayName"
        defaultValue={values.displayName}
        autoComplete="name"
        placeholder="As it should appear on a resume"
        errors={errors.displayName}
        required
      />
      {errors.form ? (
        <p className={`${styles.status} ${styles.failed}`} role="alert">
          {errors.form.join(" ")}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Create profile"}
        </Button>
      </div>
    </form>
  );
}
