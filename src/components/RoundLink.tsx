"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./Toolbar.module.css";

/** A named, 40px circular action. Downloads use an ordinary anchor. */
export function RoundLink({
  href,
  label,
  children,
  download = false,
}: {
  href: string;
  label: string;
  children: ReactNode;
  download?: boolean;
}) {
  const pathname = usePathname();
  const selected = pathname === href || pathname.startsWith(`${href}/`);
  const content = <span aria-hidden="true">{children}</span>;
  return download ? (
    <a href={href} className={styles.add} aria-label={label} title={label}>
      {content}
    </a>
  ) : (
    <Link
      aria-current={selected ? "page" : undefined}
      href={href}
      className={styles.add}
      aria-label={label}
      title={label}
    >
      {content}
    </Link>
  );
}
