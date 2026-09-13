import styles from "./Chip.module.css";

/** Sentence-case status chip; the word carries the meaning, the tint is secondary. */
export function Chip({
  tone = "accent",
  children,
}: {
  tone?: "accent" | "success" | "warning";
  children: string;
}) {
  return (
    <span className={`${styles.chip} ${tone === "accent" ? "" : styles[tone]}`}>{children}</span>
  );
}
