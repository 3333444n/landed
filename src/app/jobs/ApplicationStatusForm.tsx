"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Select } from "@/components/Select";
import formStyles from "@/components/forms.module.css";
import { fieldsKey, idleState, prefill, type ActionState, type FormValues } from "@/app/form-state";
import { applicationStatuses, statusLabels } from "@/modules/applications/contracts";

/** Manual status changes and notes for one application. Nothing here submits anything anywhere. */
export function ApplicationStatusForm({
  action,
  record,
  submittedAt,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  record: FormValues;
  submittedAt: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = prefill(state, record);

  return (
    <form action={formAction} className={formStyles.form} noValidate>
      <div key={fieldsKey(state)} className={formStyles.form}>
        <input type="hidden" name="expectedUpdatedAt" value={values.expectedUpdatedAt ?? ""} />
        <Select
          label="Status"
          name="status"
          defaultValue={values.status}
          options={applicationStatuses.map((value) => ({ value, label: statusLabels[value] }))}
          helper={
            submittedAt
              ? `Marked as applied on ${submittedAt}.`
              : "Choose Applied once you have sent the application yourself."
          }
          errors={errors.status}
        />
        <Field
          label="Notes"
          name="notes"
          multiline
          rows={4}
          helper="Contacts, dates, anything worth remembering. Optional."
          defaultValue={values.notes}
          errors={errors.notes}
        />
      </div>
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
          {pending ? "Saving" : "Save status"}
        </Button>
      </div>
    </form>
  );
}
