"use client";

import { useActionState, useState } from "react";
import { CareerFilterFields } from "@/components/CareerLink";
import { Button } from "@/components/Button";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { Field } from "@/components/Field";
import formStyles from "@/components/forms.module.css";
import { fieldsKey, idleState, prefill, type ActionState, type FormValues } from "@/app/form-state";

/**
 * Create and edit share one form. Fields remount on every result (React resets forms after an
 * action): after a save they clear with a new record id, after an error they keep the input.
 */
export function SkillForm({
  action,
  record,
  submitLabel,
  roles,
  projects,
  employmentIds = [],
  projectIds = [],
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  record?: FormValues;
  submitLabel: string;
  roles: ComboboxOption[];
  projects: ComboboxOption[];
  employmentIds?: string[];
  projectIds?: string[];
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const [selectedRoles, setSelectedRoles] = useState(employmentIds);
  const [selectedProjects, setSelectedProjects] = useState(projectIds);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = prefill(state, record ?? {});

  return (
    <form action={formAction} className={formStyles.form} noValidate>
      <CareerFilterFields />
      <Fields key={fieldsKey(state)} values={values} errors={errors} editing={!!record} />
      <Combobox
        multiple
        name="employmentIds"
        label="Linked roles"
        options={roles}
        value={selectedRoles}
        onChange={setSelectedRoles}
        errors={errors.employmentIds}
        disabled={pending}
        helper="Direct associations. Evidence-derived connections appear in the skill card."
      />
      <Combobox
        multiple
        name="projectIds"
        label="Linked projects"
        options={projects}
        value={selectedProjects}
        onChange={setSelectedProjects}
        errors={errors.projectIds}
        disabled={pending}
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
        label="Skill"
        name="displayName"
        placeholder="PostgreSQL"
        defaultValue={values.displayName}
        errors={errors.displayName}
        required
      />
      <Field
        label="Category"
        name="category"
        helper="Optional grouping, such as Languages or Tools."
        defaultValue={values.category}
        errors={errors.category}
      />
    </>
  );
}
