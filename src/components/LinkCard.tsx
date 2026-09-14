"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./Card.module.css";

/** The whole card is one link; it reads as selected while its route (or a child) is open. */
export function LinkCard({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const selected = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`${styles.card} ${styles.link} ${selected ? styles.selected : ""}`}
      aria-current={selected ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
