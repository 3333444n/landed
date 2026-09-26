import type { ResumeContent, Snapshot } from "./contracts";
import { textWidth } from "./helvetica";
import { letterLink } from "./presentation";

export const contactIds = ["phone", "email", "location", "linkedin", "github", "website"] as const;
export type ContactId = (typeof contactIds)[number];
export const defaultContactSelection: ContactId[] = [
  "phone",
  "email",
  "location",
  "linkedin",
  "github",
];
export const contactLabels: Record<ContactId, string> = {
  phone: "Phone",
  email: "Email",
  location: "Location",
  linkedin: "LinkedIn",
  github: "GitHub",
  website: "Website",
};
export interface ResumeContact {
  id?: ContactId;
  text: string;
  href: string | null;
}
export function availableResumeContacts(snapshot: Snapshot): ResumeContact[] {
  const p = snapshot.profile;
  return contactIds.flatMap<ResumeContact>((id) => {
    if (id === "phone" || id === "email" || id === "location") {
      const text = p[id];
      if (!text) return [];
      return [
        {
          id,
          text,
          href:
            id === "phone"
              ? `https://wa.me/${text.replace(/\D/g, "")}`
              : id === "email"
                ? `mailto:${text}`
                : null,
        },
      ];
    }
    const link = p.links.find(
      (item) => item.label.toLowerCase() === contactLabels[id].toLowerCase(),
    );
    return link ? [{ id, ...letterLink(link.url) }] : [];
  });
}
export function selectedResumeContacts(
  snapshot: Snapshot,
  selection: readonly ContactId[],
): ResumeContact[] {
  const available = availableResumeContacts(snapshot);
  return selection.flatMap((id) => available.filter((item) => item.id === id));
}
/** Legacy labels remain unchanged; only an unambiguous frozen-value match receives a link. */
export function resumeContacts(content: ResumeContent, snapshot: Snapshot | null): ResumeContact[] {
  if (snapshot && content.contactSelection !== undefined)
    return selectedResumeContacts(snapshot, content.contactSelection);
  const available = snapshot ? availableResumeContacts(snapshot) : [];
  return content.header.contact.map((text) => {
    const matches = available.filter(
      (item) => item.text === text || (item.href && letterLink(text).href === item.href),
    );
    return matches.length === 1 ? { ...matches[0]!, text } : { text, href: null };
  });
}
export function resumeContactSelection(
  content: ResumeContent,
  snapshot: Snapshot | null,
): ContactId[] {
  return (
    content.contactSelection ??
    resumeContacts(content, snapshot).flatMap((item) => (item.id ? [item.id] : []))
  );
}

/** The selector measures the same visible labels and Helvetica size as the PDF contact row. */
export function contactRowPreview(
  selection: readonly ContactId[],
  labels: Partial<Record<ContactId, string>>,
) {
  const text = selection
    .map((id) => {
      const value = labels[id]?.trim();
      return value && (id === "linkedin" || id === "github" || id === "website")
        ? letterLink(value).text
        : value;
    })
    .filter(Boolean)
    .join(" · ");
  return { text, wraps: textWidth(text, 9.5) > 540 };
}
