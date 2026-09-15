"use client";

import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./ToolbarMenu.module.css";

/**
 * An icon-only toolbar button that opens a small glass menu of exclusive options (DESIGN.md
 * "Toolbar"). The accessible name is the label; the icon is decoration. Follows the menu-button
 * pattern: arrow keys move, Enter or Space choose, Escape closes and returns focus.
 */
export function ToolbarMenu({
  label,
  icon,
  options,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  options: { value: string; label: string }[];
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const items = menu.current?.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]");
    const checked = Array.from(items ?? []).find((item) => item.ariaChecked === "true");
    (checked ?? items?.[0])?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menu.current?.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]") ?? [],
    );
    const index = items.findIndex((item) => item === document.activeElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div className={styles.root} ref={root}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {icon}
        {value !== defaultValue ? <span className={styles.dot} aria-hidden="true" /> : null}
      </button>
      {open ? (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={label}
          className={styles.menu}
          onKeyDown={onMenuKeyDown}
        >
          {options.map((option) => {
            const checked = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                className={styles.item}
                tabIndex={-1}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
              >
                {option.label}
                {checked ? <Check aria-hidden="true" focusable="false" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
