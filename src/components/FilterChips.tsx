"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import styles from "./FilterChips.module.css";

/** A set of independent filters; an empty selection includes every option. */
export function FilterChips({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const shown = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()),
  );
  return (
    <fieldset className={styles.group}>
      <legend>{label}</legend>
      {options.length > 8 ? (
        <input
          className={styles.search}
          type="search"
          aria-label={`Search ${label.toLowerCase()}`}
          placeholder={`Search ${label.toLowerCase()}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      <div className={styles.options}>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={value.length === 0}
          onClick={() => onChange([])}
        >
          {value.length === 0 ? <Check aria-hidden="true" /> : null}
          {allLabel}
        </button>
        {shown.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={styles.chip}
              aria-pressed={selected}
              onClick={() =>
                onChange(
                  selected ? value.filter((id) => id !== option.value) : [...value, option.value],
                )
              }
            >
              {selected ? <Check aria-hidden="true" /> : null}
              {option.label}
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="text-secondary">No matching {label.toLowerCase()}.</p>
      ) : null}
    </fieldset>
  );
}
