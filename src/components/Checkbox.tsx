import { useId, type ComponentProps } from "react";
import styles from "./Checkbox.module.css";

export function Checkbox({
  label,
  name,
  ...rest
}: { label: string; name: string } & Omit<ComponentProps<"input">, "name" | "id" | "type">) {
  const id = `${useId()}-${name}`;
  return (
    <div className={styles.row}>
      <input {...rest} type="checkbox" id={id} name={name} className={styles.box} />
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
    </div>
  );
}
