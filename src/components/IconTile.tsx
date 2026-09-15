import type { ReactNode } from "react";
import styles from "./IconTile.module.css";

/**
 * A rounded raised square holding one icon (DESIGN.md "Icon tile"). Decorative for assistive
 * technology: the word next to it carries the meaning, so accessible names never change.
 */
export function IconTile({ children, size = "md" }: { children: ReactNode; size?: "md" | "sm" }) {
  return (
    <span className={`${styles.tile} ${size === "sm" ? styles.sm : ""}`} aria-hidden="true">
      {children}
    </span>
  );
}
