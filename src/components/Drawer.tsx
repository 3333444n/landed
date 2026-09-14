"use client";

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
  const firstLinkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    firstLinkRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.menu}
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="drawer"
        onClick={() => setOpen(true)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <path
            d="M2 4h14M2 9h14M2 14h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
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
        <div className={styles.tint} ref={firstLinkRef}>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
