import { useId, type ComponentProps } from "react";
import styles from "./Field.module.css";

export function Select({
  label,
  name,
  helper,
  errors,
  options,
  ...rest
}: {
  label: string;
  name: string;
  helper?: string;
  errors?: string[];
  options: { value: string; label: string }[];
} & Omit<ComponentProps<"select">, "name" | "id">) {
  const id = `${useId()}-${name}`;
  const hasError = !!errors && errors.length > 0;
  const describedBy = [hasError ? `${id}-error` : null, helper ? `${id}-helper` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        {...rest}
        id={id}
        name={name}
        className={styles.control}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy || undefined}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {helper ? (
        <p id={`${id}-helper`} className={styles.helper}>
          {helper}
        </p>
      ) : null}
      {hasError ? (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
