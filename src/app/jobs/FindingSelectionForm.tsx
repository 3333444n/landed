"use client";
import { useActionState, useState } from "react";
import { idleState } from "@/app/form-state";
import { Button } from "@/components/Button";
import styles from "@/components/forms.module.css";
import { FindingSelector } from "./FindingSelector";
import { saveFindingSelectionAction } from "./company-actions";
export function FindingSelectionForm({
  jobId,
  version,
  findings,
  selectedIds,
}: {
  jobId: string;
  version: string;
  findings: { id: string; text: string; kind: "statement" | "interpretation" }[];
  selectedIds: string[];
}) {
  const [state, action, pending] = useActionState(
    saveFindingSelectionAction.bind(null, jobId),
    idleState,
  );
  const [ids, setIds] = useState(selectedIds);
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="expectedUpdatedAt" value={version} />
      <FindingSelector findings={findings} selectedIds={ids} onChange={setIds} disabled={pending} />
      {state.status === "error" ? (
        <p role="alert">{Object.values(state.fieldErrors).flat().join(" ")}</p>
      ) : null}
      {ids.length > 5 ? <p role="alert">Choose no more than five findings.</p> : null}
      <div className={styles.actions}>
        <Button type="submit" disabled={pending || ids.length > 5}>
          Save findings
        </Button>
      </div>
    </form>
  );
}
