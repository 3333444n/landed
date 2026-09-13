"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavBar.module.css";

const items = [
  { href: "/profile", label: "Profile" },
  { href: "/experience", label: "Experience" },
  { href: "/skills", label: "Skills" },
  { href: "/achievements", label: "Achievements" },
];

/** Floating glass navigation (DESIGN.md): the only glass surface, at most five items. */
export function NavBar() {
  const pathname = usePathname();
  return (
    <div className={styles.wrap}>
      <nav className={styles.bar} aria-label="Main">
        <Link href="/" className={styles.brand}>
          Landed
        </Link>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.item} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
