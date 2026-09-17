import { useId, type ComponentProps } from "react";
import { AutoGrowTextarea } from "./AutoGrowTextarea";
import styles from "./Field.module.css";

type Shared = {
  label: string;
  name: string;
  helper?: string;
  errors?: string[];
  /**
   * The monospace stack, allowed only on a read-only multiline field holding a preformatted
   * command block (DESIGN.md "Typography", the one exception).
   */
  mono?: boolean;
};

type InputProps = Shared & { multiline?: false } & Omit<ComponentProps<"input">, "name" | "id">;
type TextareaProps = Shared & { multiline: true } & Omit<ComponentProps<"textarea">, "name" | "id">;

export function Field(props: InputProps | TextareaProps) {
  const { label, name, helper, errors, mono, ...rest } = props;
  const id = `${useId()}-${name}`;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const hasError = !!errors && errors.length > 0;
  const describedBy = [hasError ? errorId : null, helper ? helperId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {rest.multiline ? (
        <AutoGrowTextarea
          rows={3}
          {...omitMultiline(rest)}
          id={id}
          name={name}
          className={`${styles.control} ${mono ? styles.mono : ""}`}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy || undefined}
        />
      ) : (
        <input
          {...omitMultiline(rest)}
          id={id}
          name={name}
          className={styles.control}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy || undefined}
        />
      )}
      {helper ? (
        <p id={helperId} className={styles.helper}>
          {helper}
        </p>
      ) : null}
      {hasError ? (
        <p id={errorId} className={styles.error} role="alert">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

function omitMultiline<T extends { multiline?: boolean }>(props: T): Omit<T, "multiline"> {
  const rest: T = { ...props };
  delete rest.multiline;
  return rest;
}
