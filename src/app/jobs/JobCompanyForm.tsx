"use client";
import { useActionState, useState } from "react";
import { idleState, type ActionState } from "@/app/form-state";
import { Button } from "@/components/Button";
import styles from "@/components/forms.module.css";
import { CompanyPicker } from "./CompanyPicker";
export function JobCompanyForm({
  action,
  companies,
  companyId,
  expectedUpdatedAt,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  companies: { value: string; label: string }[];
  companyId: string | null;
  expectedUpdatedAt: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const [value, onChange] = useState(companyId ?? "");
  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="expectedUpdatedAt" value={expectedUpdatedAt} />
      <CompanyPicker companies={companies} value={value} onChange={onChange} />
      {state.status === "error" ? (
        <p role="alert">{Object.values(state.fieldErrors).flat().join(" ")}</p>
      ) : null}
      <div className={styles.actions}>
        {state.status === "saved" ? <span role="status">Saved</span> : null}
        <Button type="submit" disabled={pending}>
          Save company link
        </Button>
      </div>
    </form>
  );
}
