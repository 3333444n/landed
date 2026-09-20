"use client";

import { X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "./Button";
import field from "./Field.module.css";
import styles from "./PillInput.module.css";

function uniqueValues(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLocaleLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Free-text values, serialized through the existing comma-list form contract. */
export function PillInput({
  label,
  name,
  defaultValue = "",
  errors,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  errors?: string[];
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(() => uniqueValues(defaultValue.split(",")));
  const [draft, setDraft] = useState("");
  const add = () => {
    setValues((current) => uniqueValues([...current, ...draft.split(",")]));
    setDraft("");
    input.current?.focus();
  };
  return (
    <div className={field.field}>
      <label htmlFor={id} className={field.label}>
        {label}
      </label>
      <input
        type="hidden"
        name={name}
        value={uniqueValues([...values, ...draft.split(",")]).join(",")}
      />
      {values.length ? (
        <ul className={styles.pills} aria-label={`Selected ${label.toLowerCase()}`}>
          {values.map((value) => (
            <li key={value} className={styles.pill}>
              <span>{value}</span>
              <button
                type="button"
                aria-label={`Remove ${value}`}
                title={`Remove ${value}`}
                onClick={() => {
                  setValues((current) => current.filter((item) => item !== value));
                  input.current?.focus();
                }}
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.row}>
        <input
          ref={input}
          id={id}
          className={field.control}
          value={draft}
          placeholder="Add a desired role"
          aria-describedby={`${id}-help${errors?.length ? ` ${id}-error` : ""}`}
          aria-invalid={errors?.length ? true : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      <p id={`${id}-help`} className={field.helper}>
        Press Enter or Add for each role. You can also paste a comma-separated list.
      </p>
      {errors?.length ? (
        <p id={`${id}-error`} className={field.error} role="alert">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
