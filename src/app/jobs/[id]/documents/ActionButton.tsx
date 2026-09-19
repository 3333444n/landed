"use client";

import { useActionState, type ReactNode } from "react";
import { idleState, type ActionState } from "@/app/form-state";
import { Button } from "@/components/Button";
import styles from "./documents.module.css";

/** A one-button form for a bound Server Action (Generate, Mark reviewed). */
export function ActionButton({
  action,
  label,
  pendingLabel,
  variant = "primary",
  icon,
  tone,
  pressed,
  title,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary";
  icon?: ReactNode;
  tone?: "success" | "warning";
  pressed?: boolean;
  title?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const error = state.status === "error" ? Object.values(state.fieldErrors).flat().join(" ") : "";
  return (
    <form action={formAction}>
      <Button
        type="submit"
        variant={variant}
        disabled={pending}
        className={tone ? styles[tone] : undefined}
        aria-pressed={pressed}
        title={title}
      >
        {icon ? (
          <span className={styles.actionIcon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {pending ? pendingLabel : label}
      </Button>
      {error ? (
        <p className={`${styles.status} ${styles.failed}`} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
