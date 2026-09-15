"use client";

import { Moon, Sun } from "lucide-react";
import styles from "./ThemeToggle.module.css";

const storageKey = "landed-theme";

function effectiveTheme(): "light" | "dark" {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Switches between light and dark by setting `data-theme` on the root and remembering it in
 * localStorage; the layout's inline script applies it before the first paint. Without a saved
 * choice the system preference applies. The glyph shows the scheme the click would switch to.
 */
export function ThemeToggle() {
  const toggle = () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Storage may be unavailable; the choice then lasts for the page.
    }
  };
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label="Switch between light and dark"
      title="Switch between light and dark"
    >
      <Sun className={styles.sun} aria-hidden="true" focusable="false" />
      <Moon className={styles.moon} aria-hidden="true" focusable="false" />
    </button>
  );
}
