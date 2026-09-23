"use client";
import { useActionState, useState } from "react";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { Button } from "@/components/Button";
import styles from "@/components/forms.module.css";
import { idleState, prefill, fieldsKey, type ActionState, type FormValues } from "@/app/form-state";
export function CompanyForm({
  action,
  record,
  finding = false,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  record?: FormValues;
  finding?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const values = prefill(state, record ?? {});
  const errors = state.status === "error" ? state.fieldErrors : {};
  return (
    <form action={formAction} className={styles.form} noValidate>
      <Fields key={fieldsKey(state)} values={values} errors={errors} finding={finding} />
      {errors.form ? (
        <p role="alert" className={styles.failed}>
          {errors.form.join(" ")}
        </p>
      ) : null}
      <div className={styles.actions}>
        {state.status === "saved" ? <span role="status">Saved</span> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
function Fields({
  values,
  errors,
  finding,
}: {
  values: FormValues;
  errors: Record<string, string[]>;
  finding: boolean;
}) {
  const [id] = useState(() => values.id ?? crypto.randomUUID());
  return (
    <>
      <input type="hidden" name="id" value={id} />
      {values.expectedUpdatedAt ? (
        <input type="hidden" name="expectedUpdatedAt" value={values.expectedUpdatedAt} />
      ) : null}
      {finding ? (
        <>
          <Field
            label="Finding"
            name="text"
            multiline
            rows={5}
            defaultValue={values.text}
            errors={errors.text}
            required
            helper="Describe one sourced observation. Preserve uncertainty and avoid treating opinions as facts."
          />
          <Field
            label="Source URL"
            name="sourceUrl"
            type="url"
            defaultValue={values.sourceUrl}
            errors={errors.sourceUrl}
            required
            placeholder="https://"
          />
          <Field
            label="Retrieved on"
            name="retrievedAt"
            type="date"
            defaultValue={values.retrievedAt ?? new Date().toISOString().slice(0, 10)}
            errors={errors.retrievedAt}
            required
          />
          <Select
            label="Kind"
            name="kind"
            defaultValue={values.kind ?? "statement"}
            options={[
              { value: "statement", label: "Direct statement" },
              { value: "interpretation", label: "Interpretation" },
            ]}
            errors={errors.kind}
          />
        </>
      ) : (
        <>
          <Field
            label="Name"
            name="name"
            defaultValue={values.name}
            errors={errors.name}
            required
          />
          <Field
            label="Location"
            name="location"
            defaultValue={values.location}
            errors={errors.location}
          />
          <Field
            label="Website"
            name="website"
            type="url"
            defaultValue={values.website}
            errors={errors.website}
            placeholder="https://"
          />
          <Field
            label="About"
            name="about"
            multiline
            rows={6}
            defaultValue={values.about}
            errors={errors.about}
            helper="What the company does and the context you want considered in cover letters. A website link is stored; Landed does not read it automatically."
          />
        </>
      )}
    </>
  );
}
