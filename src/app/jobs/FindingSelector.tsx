"use client";
import { Combobox } from "@/components/Combobox";
export function FindingSelector({
  findings,
  selectedIds,
  onChange,
  errors,
  disabled,
}: {
  findings: { id: string; text: string; kind: "statement" | "interpretation" }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  errors?: string[];
  disabled?: boolean;
}) {
  return (
    <Combobox
      multiple
      name="findingIds"
      label="Company findings"
      options={findings.map((f) => ({
        value: f.id,
        label: `${f.kind === "interpretation" ? "Interpretation: " : ""}${f.text}`,
      }))}
      value={selectedIds}
      onChange={onChange}
      errors={errors}
      disabled={disabled}
      helper="Select up to five findings relevant to this application. Interpretations remain uncertain."
      emptyMessage="Add findings on the company page first."
    />
  );
}
