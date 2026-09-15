"use client";

import { Briefcase, Settings, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconTile } from "./IconTile";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./SidebarNav.module.css";

const items = [
  { href: "/about", label: "About me", icon: UserRound },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/settings/model", label: "Settings", icon: Settings },
];

/** The brand, at most five items and the theme switch; shared by the sidebar and the drawer. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Main">
      <Link href="/" className={styles.brand} onClick={onNavigate}>
        <Image
          src="/logo/mark-dark.png"
          alt=""
          width={28}
          height={28}
          className={`${styles.mark} ${styles.markDark}`}
          priority
        />
        <Image
          src="/logo/mark-light.png"
          alt=""
          width={28}
          height={28}
          className={`${styles.mark} ${styles.markLight}`}
          priority
        />
        LANDED
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
      <div className={styles.footer}>
        <ThemeToggle />
      </div>
    </nav>
  );
}
