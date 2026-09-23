"use client";

import { useActionState, useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { SourcePicker, type SourceOption } from "./SourcePicker";
import { CompanyPicker } from "./CompanyPicker";
import type { ComboboxOption } from "@/components/Combobox";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import { WordCloud } from "@/components/WordCloud";
import formStyles from "@/components/forms.module.css";
import { fieldsKey, idleState, prefill, type ActionState, type FormValues } from "@/app/form-state";
import { availabilityLabels, jobAvailabilities } from "@/modules/jobs/contracts";
// Imported from the rules file, not the module index: the index pulls in the service and the
// database, and this component runs in the browser.
import { buildWordCloud, type SkillLike } from "@/modules/jobs/rules";

/**
 * Paste and edit share one form. Fields remount on every result (React resets forms after an
 * action): after a save they clear with a new record id, after an error they keep the input.
 */
/** Stable form id for the posting editor. */
export const jobFormId = "job-form";

export function JobForm({
  action,
  record,
  submitLabel,
  skills,
  sources = [],
  companies = [],
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  record?: FormValues;
  submitLabel: string;
  /** The profile's skills as plain data, so the live word cloud can tint its matches. */
  companies?: ComboboxOption[];
  skills: SkillLike[];
  sources?: SourceOption[];
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const [sourceId, setSourceId] = useState(record?.jobSourceId ?? "");
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = prefill(state, record ?? {});

  return (
    <form id={jobFormId} action={formAction} className={formStyles.form} noValidate>
      <Fields
        key={fieldsKey(state)}
        values={values}
        errors={errors}
        editing={!!record}
        skills={skills}
        companies={companies}
        sourceControl={
          <SourcePicker
            sources={sources}
            value={sourceId}
            onChange={setSourceId}
            errors={errors.jobSourceId}
          />
        }
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
  skills,
  companies,
  sourceControl,
}: {
  values: FormValues;
  errors: Record<string, string[]>;
  editing: boolean;
  companies: ComboboxOption[];
  sourceControl: ReactNode;
  skills: SkillLike[];
}) {
  const [companyId, setCompanyId] = useState(values.companyId ?? "");
  const [recordId] = useState(() => values.id ?? crypto.randomUUID());
  // The word cloud follows the description as it is typed or pasted. The deferred value lets a
  // long paste render first and the cloud catch up, so typing never waits on the count.
  const [description, setDescription] = useState(values.rawDescription ?? "");
  const deferredDescription = useDeferredValue(description);
  const cloud = useMemo(
    () => buildWordCloud(deferredDescription, skills),
    [deferredDescription, skills],
  );
  return (
    <>
      {editing ? (
        <input type="hidden" name="expectedUpdatedAt" value={values.expectedUpdatedAt ?? ""} />
      ) : (
        <input type="hidden" name="id" value={recordId} />
      )}
      <Field
        label="Title"
        name="title"
        placeholder="Full-stack developer"
        defaultValue={values.title}
        errors={errors.title}
        required
      />
      <CompanyPicker
        companies={companies}
        value={companyId}
        onChange={setCompanyId}
        errors={errors.companyId}
      />
      {editing ? (
        <Select
          label="Availability"
          name="availability"
          defaultValue={values.availability ?? "active"}
          options={jobAvailabilities.map((value) => ({ value, label: availabilityLabels[value] }))}
          helper="Whether the posting is still open. It never changes your application's status."
          errors={errors.availability}
        />
      ) : null}
      {sourceControl}
      <Field
        label="Location"
        name="location"
        helper="City, country or remote. Optional."
        defaultValue={values.location}
        errors={errors.location}
      />
      <Field
        label="Salary"
        name="salary"
        helper="As the posting states it, any currency or period. Optional."
        defaultValue={values.salary}
        errors={errors.salary}
      />
      <Field
        label="Posting URL"
        name="sourceUrl"
        type="url"
        inputMode="url"
        placeholder="https://"
        defaultValue={values.sourceUrl}
        errors={errors.sourceUrl}
      />
      <Field
        label="Description"
        name="rawDescription"
        multiline
        rows={14}
        helper="Paste the posting as it is. It is kept as data, never followed as instructions."
        defaultValue={values.rawDescription}
        errors={errors.rawDescription}
        onChange={(event) => setDescription(event.target.value)}
        required
      />
      <WordCloud items={cloud} variant="inline" />
    </>
  );
}
