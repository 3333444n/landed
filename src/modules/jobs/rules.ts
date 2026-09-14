/*
 * Pure rules for postings. No database, no framework.
 */

/** The first non-empty line of a pasted description, trimmed to fit a card's metadata line. */
export function jobSummary(rawDescription: string, max = 140): string {
  const line = rawDescription
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
