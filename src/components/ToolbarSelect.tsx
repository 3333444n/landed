import type { ComponentProps } from "react";
import styles from "./ToolbarSelect.module.css";

/** A compact select for a column toolbar (DESIGN.md "Toolbar"); the label is its accessible name. */
export function ToolbarSelect({
  label,
  options,
  ...rest
}: {
  label: string;
  options: { value: string; label: string }[];
} & Omit<ComponentProps<"select">, "aria-label" | "className">) {
  return (
    <select {...rest} aria-label={label} className={styles.select}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
