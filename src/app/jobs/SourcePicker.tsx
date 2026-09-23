"use client";
import { useState, useTransition } from "react";
import { Combobox } from "@/components/Combobox";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { createSourceInline } from "@/app/settings/job-sources/actions";
export type SourceOption = { id: string; name: string; archived: boolean };
export function SourcePicker({
  sources,
  value,
  onChange,
  errors,
}: {
  sources: SourceOption[];
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
}) {
  const [added, setAdded] = useState<SourceOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [retryId, setRetryId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const all = [
    ...sources,
    ...added.filter((s) => !sources.some((existing) => existing.id === s.id)),
  ];
  return (
    <>
      <Combobox
        name="jobSourceId"
        label="Source"
        value={value}
        onChange={onChange}
        options={all
          .filter((s) => !s.archived || s.id === value)
          .map((s) => ({ value: s.id, label: s.name + (s.archived ? " (Archived)" : "") }))}
        errors={errors}
        helper="Where you found this job. Optional."
        emptyMessage="No sources yet. Add a source below."
      />
      {!value ? (
        <input type="hidden" name="jobSourceId" value="" />
      ) : (
        <Button type="button" variant="secondary" onClick={() => onChange("")}>
          Clear source
        </Button>
      )}
      {adding ? (
        <>
          <Field
            name="newSourceName"
            label="New source name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            errors={error ? [error] : undefined}
          />
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await createSourceInline(retryId, name);
                if (!result.ok) {
                  setError(
                    result.error.kind === "validation"
                      ? Object.values(result.error.fieldErrors).flat().join(" ")
                      : result.error.message,
                  );
                  return;
                }
                setAdded((previous) => [...previous, result.value]);
                onChange(result.value.id);
                setName("");
                setError("");
                setAdding(false);
                setRetryId(crypto.randomUUID());
              })
            }
          >
            {pending ? "Adding" : "Save source"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => setAdding(false)}
          >
            Cancel
          </Button>
        </>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
          Add a source
        </Button>
      )}
    </>
  );
}
