import type { ResumeContent, Snapshot } from "./contracts";
import { letterLink } from "./presentation";

export const contactIds = ["phone", "email", "location", "linkedin", "github", "website"] as const;
export type ContactId = (typeof contactIds)[number];
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
/** Legacy labels remain unchanged; only an unambiguous frozen-value match receives a link. */
export function resumeContacts(content: ResumeContent, snapshot: Snapshot | null): ResumeContact[] {
  const available = snapshot ? availableResumeContacts(snapshot) : [];
  return content.header.contact.map((text) => {
    const matches = available.filter(
      (item) => item.text === text || (item.href && letterLink(text).href === item.href),
    );
    return matches.length === 1 ? { ...matches[0]!, text } : { text, href: null };
  });
}
