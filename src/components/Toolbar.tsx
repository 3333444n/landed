import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Toolbar.module.css";

/** One row under a column title: filter and sort on the left, the add control on the right. */
export function Toolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>{left}</div>
      <div className={styles.right}>{right}</div>
    </div>
  );
}

/** The round add control; the accessible name says what it adds ("Add achievement"). */
export function AddLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={styles.add} aria-label={label} title={label}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </Link>
  );
}
