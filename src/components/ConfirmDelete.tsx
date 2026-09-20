"use client";

import { useActionState, useState } from "react";
import { idleState, type ActionState } from "@/app/form-state";
import { CareerFilterFields } from "@/components/CareerLink";
import { Button } from "./Button";
import styles from "./ConfirmDelete.module.css";

/**
 * Destructive action per DESIGN.md: danger text on a secondary button, filled only inside the
 * confirmation. The action is a Server Action already bound to the record id.
 */
export function ConfirmDelete({
  action,
  what,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  what: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, idleState);
  const error = state.status === "error" ? Object.values(state.fieldErrors).flat().join(" ") : "";

  if (!open) {
    return (
      <div className={styles.inline}>
        <Button variant="secondary" className={styles.danger} onClick={() => setOpen(true)}>
          Delete
        </Button>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <form action={formAction} className={styles.inline}>
      <CareerFilterFields />
      <span className={styles.question}>Delete this {what}?</span>
      <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" className={styles.dangerFilled} disabled={pending}>
        {pending ? "Deleting" : "Delete"}
      </Button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
