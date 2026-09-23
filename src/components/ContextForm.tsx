"use client";

import { useActionState } from "react";
import { Button } from "./Button";
import { Field } from "./Field";
import { fieldsKey, idleState, prefill, type ActionState } from "@/app/form-state";
import styles from "./forms.module.css";

/** A partial edit of one optional narrative, preserving entered text on errors. */
export function ContextForm({
  action,
  name,
  label,
  value,
  version,
  placeholder,
  helper,
}: {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  name: string;
  label: string;
  value: string | null;
  version: string;
  placeholder: string;
  helper: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const values = prefill(state, { [name]: value ?? "", expectedUpdatedAt: version });
  return (
    <form action={formAction} className={styles.form} noValidate>
      <div key={`${fieldsKey(state)}-${version}`}>
        <input type="hidden" name="expectedUpdatedAt" value={values.expectedUpdatedAt} />
        <Field
          name={name}
          label={label}
          multiline
          rows={12}
          defaultValue={values[name]}
          placeholder={placeholder}
          helper={helper}
          errors={state.status === "error" ? state.fieldErrors[name] : undefined}
        />
      </div>
      {state.status === "error" ? (
        <p role="alert" className={styles.failed}>
          {Object.entries(state.fieldErrors)
            .filter(([key]) => key !== name)
            .flatMap(([, errors]) => errors)
            .join(" ")}
        </p>
      ) : null}
      <div className={styles.actions}>
        {state.status === "saved" ? <span role="status">Saved</span> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
      </div>
    </form>
  );
}
