import type { Snapshot } from "./contracts";

export interface LetterLink {
  strong?: boolean;
  text: string;
  href: string | null;
}

export interface LetterHeader {
  name: string;
  title: string | null;
  topContact: LetterLink[];
  locationLines: string[];
  nameLines: string[];
  footerLinks: LetterLink[];
  date: string;
  company: string | null;
  role: string | null;
}

/** Shared by the browser and PDF; saved letters never read live profile or company data. */
export function letterHeaderFrom(
  snapshot: Snapshot | null,
  fallbackDate: Date,
  fallbackName = "",
): LetterHeader {
  const p = snapshot?.profile;
  const links = (p?.links ?? []).map((link) => ({
    ...letterLink(link.url),
    label: link.label.toLowerCase(),
  }));
  const isLinkedIn = (link: (typeof links)[number]) =>
    link.label === "linkedin" || /^https?:\/\/(www\.)?linkedin\.com(?:\/|$)/i.test(link.href ?? "");
  const topContact: LetterLink[] = links
    .filter(isLinkedIn)
    .map(({ text, href }) => ({ text, href, strong: true }));
  if (p?.email) topContact.push({ text: p.email, href: `mailto:${p.email}` });
  if (p?.phone)
    topContact.push({ text: p.phone, href: `https://wa.me/${p.phone.replace(/\D/g, "")}` });
  const footerLinks = links
    .filter((link) => !isLinkedIn(link))
    .sort((a, b) => Number(b.label === "github") - Number(a.label === "github"))
    .map(({ text, href }) => ({ text, href }));
  return {
    name: p?.displayName ?? fallbackName,
    nameLines: splitLetterName(p?.displayName ?? fallbackName),
    title: p?.headline ?? null,
    topContact,
    footerLinks,
    locationLines: splitLetterLocation(p?.location ?? ""),
    date: new Date(snapshot?.capturedAt ?? fallbackDate).toLocaleDateString("en", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    company: snapshot?.job.companyName || null,
    role: snapshot?.job.title || null,
  };
}

export function letterSalutation(text: string): string {
  return `${text.trim().replace(/(?:,\s*)+$/, "")},`;
}

/** A display-only line break; the saved full name is unchanged. */
export function splitLetterName(name: string): string[] {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return rest.length ? [first, rest.join(" ")] : [first];
}

/** Keep the full web destination, shortening only its visible label. */
export function letterLink(value: string): { text: string; href: string | null } {
  const text = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    return { text, href: ["https:", "http:"].includes(url.protocol) ? url.href : null };
  } catch {
    return { text, href: null };
  }
}

export function splitLetterLocation(location: string): string[] {
  const split = location.lastIndexOf(",");
  return (
    split < 0
      ? [location.trim()]
      : [location.slice(0, split).trim(), location.slice(split + 1).trim()]
  ).filter(Boolean);
}
