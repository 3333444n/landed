"use client";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "./Checkbox";
import { IconTile } from "./IconTile";
import {
  contactIds,
  contactLabels,
  contactRowPreview,
  type ContactId,
} from "@/modules/documents/contacts";
import styles from "./ContactSelection.module.css";
export function ContactSelection({
  value,
  onChange,
  labels = {},
  disabled = false,
  title = "Resume contact details",
}: {
  value: ContactId[];
  onChange: (value: ContactId[]) => void;
  labels?: Partial<Record<ContactId, string>>;
  disabled?: boolean;
  title?: string;
}) {
  const preview = contactRowPreview(value, labels);
  const ordered = [...value, ...contactIds.filter((id) => !value.includes(id))];
  function move(index: number, delta: number) {
    const next = [...value];
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    onChange(next);
  }
  return (
    <fieldset className={styles.group} disabled={disabled}>
      <legend>{title}</legend>
      {ordered.map((id) => {
        const index = value.indexOf(id);
        return (
          <div className={styles.row} key={id}>
            <Checkbox
              name={`contact-${id}`}
              label={`Show ${contactLabels[id]}`}
              checked={index >= 0}
              onChange={(e) =>
                onChange(e.target.checked ? [...value, id] : value.filter((item) => item !== id))
              }
            />
            <span className={styles.value}>{labels[id] || "Not provided"}</span>
            <button
              type="button"
              aria-label={`Move ${contactLabels[id]} up`}
              disabled={index <= 0}
              onClick={() => move(index, -1)}
            >
              <IconTile size="sm">
                <ArrowUp />
              </IconTile>
            </button>
            <button
              type="button"
              aria-label={`Move ${contactLabels[id]} down`}
              disabled={index < 0 || index === value.length - 1}
              onClick={() => move(index, 1)}
            >
              <IconTile size="sm">
                <ArrowDown />
              </IconTile>
            </button>
          </div>
        );
      })}
      <p className={styles.preview} aria-live="polite">
        {preview.text || "No contact details shown"}
      </p>
      {preview.wraps ? (
        <p className={styles.warning} role="status">
          The contact line will wrap in the PDF. Hide an item to keep it on one line.
        </p>
      ) : null}
    </fieldset>
  );
}
