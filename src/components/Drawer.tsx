"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SidebarNav } from "./SidebarNav";
import styles from "./Drawer.module.css";

/**
 * Below 1200px the sidebar hides behind a hamburger (DESIGN.md "Drawer"). The drawer is the
 * one glass surface; a solid tint sits behind its text and a scrim covers the page.
 */
export function Drawer() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const wasOpen = useRef(false);

  // Focus moves to the close button on open and back to the hamburger once it is visible again.
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) buttonRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.menu} ${open ? styles.hidden : ""}`}
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="drawer"
        onClick={() => setOpen(true)}
      >
        <Menu aria-hidden="true" focusable="false" />
      </button>
      <div
        className={`${styles.scrim} ${open ? styles.open : ""}`}
        onClick={close}
        aria-hidden="true"
      />
      <div
        id="drawer"
        className={`${styles.drawer} ${open ? styles.open : ""}`}
        aria-hidden={!open}
        // Off-screen links must not be reachable by keyboard while closed.
        inert={!open}
      >
        <div className={styles.tint}>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close menu"
            title="Close menu"
            onClick={close}
          >
            <X aria-hidden="true" focusable="false" />
          </button>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
