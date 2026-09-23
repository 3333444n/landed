/** Findings are untrusted research, including when supplied by a user's assistant. */
export function findingKindLabel(kind: "statement" | "interpretation") {
  return kind === "statement" ? "Direct statement" : "Interpretation";
}
