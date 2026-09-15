"use client";

import { Briefcase, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconTile } from "./IconTile";
import styles from "./SidebarNav.module.css";

const items = [
  { href: "/about", label: "About me", icon: UserRound },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/settings/model", label: "Settings", icon: Settings },
];

/** The brand and at most five items; shared by the sidebar and the drawer. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Main">
      <Link href="/" className={styles.brand} onClick={onNavigate}>
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
            onClick={onNavigate}
          >
            <IconTile size="sm">
              <item.icon />
            </IconTile>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
