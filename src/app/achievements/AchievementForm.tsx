"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import formStyles from "@/components/forms.module.css";
import { fieldsKey, idleState, prefill, type ActionState, type FormValues } from "@/app/form-state";
import styles from "./achievements.module.css";

export type Option = { value: string; label: string };

/**
 * Create and edit share one form. Fields remount on every result (React resets forms after an
 * action): after a save they clear with a new record id, after an error they keep the input.
 * Link options (jobs, projects, skills) come from the page so this stays a plain client form.
 */
export function AchievementForm({
  action,
  record,
  recordSkillIds = [],
  submitLabel,
  jobs,
  projects,
  skills,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  record?: FormValues;
  /** Skill links of the record being edited; FormValues only holds strings. */
  recordSkillIds?: string[];
  submitLabel: string;
  jobs: Option[];
  projects: Option[];
  skills: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = prefill(state, record ?? {});

  return (
    <form action={formAction} className={formStyles.form} noValidate>
      <Fields
        key={fieldsKey(state)}
        values={values}
        errors={errors}
        editing={!!record}
        recordSkillIds={recordSkillIds}
        jobs={jobs}
        projects={projects}
        skills={skills}
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
  recordSkillIds,
  jobs,
  projects,
  skills,
}: {
  values: FormValues;
  errors: Record<string, string[]>;
  editing: boolean;
  recordSkillIds: string[];
  jobs: Option[];
  projects: Option[];
  skills: Option[];
}) {
  // Generated once per blank form and kept across errors: a retry after a lost response saves
  // the same record instead of a duplicate (docs/05).
  const [recordId] = useState(() => values.id ?? crypto.randomUUID());
  // FormValues keeps only the last string per key, so a multi-value checkbox group cannot be
  // echoed back after an error; the boxes fall back to the record's links instead.
  const checkedSkills = new Set(recordSkillIds);

  return (
    <>
      {editing ? (
        <input type="hidden" name="expectedUpdatedAt" value={values.expectedUpdatedAt ?? ""} />
      ) : (
        <input type="hidden" name="id" value={recordId} />
      )}
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
        label="Problem"
        name="problem"
        multiline
        defaultValue={values.problem}
        helper="What was wrong or missing before. Optional."
        errors={errors.problem}
      />
      <Field
        label="Action"
        name="action"
        multiline
        defaultValue={values.action}
        helper="What you did about it. Optional."
        errors={errors.action}
      />
      <Field
        label="Result"
        name="result"
        multiline
        defaultValue={values.result}
        helper="What changed because of it. A metric is never required."
        errors={errors.result}
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
      <Select
        label="Job"
        name="employmentId"
        defaultValue={values.employmentId ?? ""}
        options={[{ value: "", label: "Not linked to a job" }, ...jobs]}
        errors={errors.employmentId}
      />
      <Select
        label="Project"
        name="projectId"
        defaultValue={values.projectId ?? ""}
        options={[{ value: "", label: "Not linked to a project" }, ...projects]}
        helper="An achievement links to a job or a project, not both."
        errors={errors.projectId}
      />
      <fieldset className={styles.group}>
        <legend className={styles.groupLabel}>Skills used</legend>
        {skills.length === 0 ? (
          <p className={`body-sm ${styles.groupHelper}`}>
            Add skills on the Skills page to link them here.
          </p>
        ) : (
          skills.map((skill) => (
            <Checkbox
              key={skill.value}
              label={skill.label}
              name="skillIds"
              value={skill.value}
              defaultChecked={checkedSkills.has(skill.value)}
            />
          ))
        )}
        {errors.skillIds ? (
          <p className={`${formStyles.status} ${formStyles.failed}`} role="alert">
            {errors.skillIds.join(" ")}
          </p>
        ) : null}
      </fieldset>
      {editing ? (
        <div className={styles.group}>
          <Checkbox label="Reviewed" name="reviewed" defaultChecked={values.reviewed === "on"} />
          <p className={styles.groupHelper}>
            Mark it once you have checked the statement against its source. Editing the statement
            clears this again.
          </p>
        </div>
      ) : null}
    </>
  );
}
