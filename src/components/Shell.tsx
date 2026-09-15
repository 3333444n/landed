import type { ReactNode } from "react";
import { Drawer } from "./Drawer";
import { SidebarNav } from "./SidebarNav";
import styles from "./Shell.module.css";

/**
 * The page frame (DESIGN.md "Layout"): a persistent sidebar from 1200px, a hamburger drawer
 * below it, and a row of columns that the route tree fills.
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <SidebarNav />
        </div>
      </aside>
      <Drawer />
      <div className={styles.columns}>{children}</div>
    </div>
  );
}
