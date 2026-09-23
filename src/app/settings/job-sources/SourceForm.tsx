"use client";
import { useActionState, useState } from "react";
import { idleState, prefill, fieldsKey, type FormValues } from "@/app/form-state";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import styles from "@/components/forms.module.css";
import { saveSourceAction } from "./actions";
export function SourceForm({ id, record }: { id?: string; record?: FormValues }) {
  const [state, action, pending] = useActionState(saveSourceAction.bind(null, id), idleState);
  const [retryId] = useState(() => crypto.randomUUID());
  const values = prefill(state, record ?? {});
  const errors = state.status === "error" ? state.fieldErrors : {};
  return (
    <form action={action} className={styles.form} key={fieldsKey(state)}>
      <input type="hidden" name="id" value={retryId} />
      <input type="hidden" name="expectedUpdatedAt" value={values.expectedUpdatedAt ?? ""} />
      <Field name="name" label="Name" defaultValue={values.name} errors={errors.name} required />
      {id ? (
        <Select
          name="archived"
          label="Status"
          defaultValue={values.archived ?? "false"}
          options={[
            { value: "false", label: "Active" },
            { value: "true", label: "Archived" },
          ]}
          helper="Archived sources stay on existing jobs and are hidden from new selections."
        />
      ) : null}
      {errors.form ? (
        <p role="alert" className={styles.failed}>
          {errors.form.join(" ")}
        </p>
      ) : null}
      <div className={styles.actions}>
        {state.status === "saved" ? <span role="status">Saved</span> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save source"}
        </Button>
      </div>
    </form>
  );
}
