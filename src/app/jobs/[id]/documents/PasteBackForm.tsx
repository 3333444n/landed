"use client";

import { useActionState } from "react";
import { fieldsKey, idleState, type ActionState } from "@/app/form-state";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import formStyles from "@/components/forms.module.css";

/** The user pastes the assistant's JSON answer; the server validates and checks it. */
export function PasteBackForm({
  action,
  runId,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  runId: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};
  return (
    <form action={formAction} className={formStyles.form} noValidate>
      <div key={fieldsKey(state)} className={formStyles.form}>
        <input type="hidden" name="runId" value={runId} />
        <Field
          label="The model's answer"
          name="json"
          multiline
          rows={12}
          helper="Paste the whole JSON answer. Code fences are fine."
          defaultValue={values.json ?? ""}
          errors={errors.json}
        />
      </div>
      {errors.form ? (
        <p className={`${formStyles.status} ${formStyles.failed}`} role="alert">
          {errors.form.join(" ")}
        </p>
      ) : null}
      <div className={formStyles.actions}>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save answer"}
        </Button>
      </div>
    </form>
  );
}
