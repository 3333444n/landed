"use client";
import { useState, useTransition } from "react";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { createCompanyInline } from "@/app/companies/actions";
export function CompanyPicker({
  companies,
  value,
  onChange,
  errors,
}: {
  companies: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
}) {
  const [created, setCreated] = useState<ComboboxOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [retryId, setRetryId] = useState(() => crypto.randomUUID());
  const options = [
    ...companies,
    ...created.filter((c) => !companies.some((e) => e.value === c.value)),
  ];
  return (
    <>
      <Combobox
        name="companyId"
        label="Linked company"
        options={options}
        value={value}
        onChange={onChange}
        errors={errors}
        helper="Optional shared company context. The posting's company name stays as written."
        emptyMessage="No companies yet."
      />
      {!value ? (
        <input type="hidden" name="companyId" value="" />
      ) : (
        <Button type="button" variant="secondary" onClick={() => onChange("")}>
          Clear company
        </Button>
      )}
      {adding ? (
        <>
          <Field
            label="New company name"
            name="newCompanyName"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await createCompanyInline(retryId, name);
                if (result.ok) {
                  setCreated((prev) => [
                    ...prev,
                    { value: result.value.id, label: result.value.name },
                  ]);
                  onChange(result.value.id);
                  setAdding(false);
                  setName("");
                  setError("");
                  setRetryId(crypto.randomUUID());
                } else
                  setError(
                    result.error.kind === "validation"
                      ? Object.values(result.error.fieldErrors).flat().join(" ")
                      : result.error.message,
                  );
              })
            }
          >
            {pending ? "Creating" : "Create company"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
            Cancel
          </Button>
          {error ? <p role="alert">{error}</p> : null}
        </>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
          Add a company
        </Button>
      )}
    </>
  );
}
