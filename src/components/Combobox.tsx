"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Chip } from "./Chip";
import styles from "./Combobox.module.css";

export type ComboboxOption = { value: string; label: string };

type Selection =
  | { multiple: true; value: string[]; onChange: (value: string[]) => void }
  | { multiple?: false; value: string; onChange: (value: string) => void };

export type ComboboxProps = Selection & {
  name: string;
  label: string;
  options: ComboboxOption[];
  placeholder?: string;
  helper?: string;
  errors?: string[];
  disabled?: boolean;
  emptyMessage?: string;
};

/** Controlled selection; repeated hidden inputs submit multiple values through FormData. */
export function Combobox(props: ComboboxProps) {
  const {
    name,
    label,
    options,
    placeholder = "Search options",
    helper,
    errors,
    disabled = false,
    emptyMessage = "No matching options.",
  } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const values = props.multiple ? props.value : props.value ? [props.value] : [];
  const selected = options.filter((option) => values.includes(option.value));
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const activeIndex = Math.min(active, filtered.length - 1);
  const expanded = open && !disabled;
  const describedBy =
    [helper ? `${id}-helper` : "", errors?.length ? `${id}-error` : ""].filter(Boolean).join(" ") ||
    undefined;

  useEffect(() => {
    if (expanded && activeIndex >= 0) {
      root.current
        ?.querySelector(`[data-index="${activeIndex}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [expanded, activeIndex, query]);

  useEffect(() => {
    if (!expanded) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [expanded]);

  const choose = (option: ComboboxOption) => {
    if (props.multiple) {
      props.onChange(
        values.includes(option.value)
          ? values.filter((value) => value !== option.value)
          : [...values, option.value],
      );
    } else {
      props.onChange(option.value);
    }
    // Close after selection so dismissing an inline panel cannot move the next
    // form control between pointer-down and click. Reopen to select another item.
    setOpen(false);
    setQuery("");
  };

  return (
    <div
      ref={root}
      className={styles.root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {(props.multiple ? values : [props.value]).map((value) => (
        <input key={value} type="hidden" name={name} value={value} disabled={disabled} />
      ))}
      <input
        id={id}
        role="combobox"
        className={styles.trigger}
        autoComplete="off"
        value={expanded ? query : props.multiple ? "" : (selected[0]?.label ?? "")}
        placeholder={placeholder}
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={`${id}-options`}
        aria-activedescendant={
          expanded && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive(
              expanded
                ? Math.max(
                    0,
                    Math.min(
                      filtered.length - 1,
                      activeIndex + (event.key === "ArrowDown" ? 1 : -1),
                    ),
                  )
                : event.key === "ArrowDown"
                  ? 0
                  : Math.max(0, filtered.length - 1),
            );
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (expanded && filtered[activeIndex]) choose(filtered[activeIndex]);
            else setOpen(true);
          } else if (event.key === "Escape" && expanded) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            setQuery("");
          } else if (event.key === "Tab") {
            setOpen(false);
            setQuery("");
          }
        }}
      />
      <div
        id={`${id}-options`}
        role="listbox"
        aria-label={label}
        aria-multiselectable={props.multiple || undefined}
        hidden={!expanded}
        className={styles.panel}
      >
        <div className={styles.options}>
          {filtered.map((option, index) => (
            <div
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={values.includes(option.value)}
              data-index={index}
              data-active={index === activeIndex}
              className={styles.option}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              <span aria-hidden="true">{values.includes(option.value) ? "✓" : ""}</span>
            </div>
          ))}
        </div>
      </div>
      {expanded && filtered.length === 0 ? (
        <p className={styles.helper} role="status">
          {emptyMessage}
        </p>
      ) : null}
      {props.multiple && selected.length ? (
        <div className={styles.chips}>
          {selected.map((option) => (
            <Chip key={option.value}>{option.label}</Chip>
          ))}
        </div>
      ) : null}
      {helper ? (
        <p id={`${id}-helper`} className={styles.helper}>
          {helper}
        </p>
      ) : null}
      {errors?.length ? (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
