import type {
  DocumentType,
  DocumentContent,
  ResumeContent,
  CoverLetterContent,
  RecruiterMessageContent,
} from "./contracts";

/** Editable text is distinct from prose that requires citations. */
export interface EditableField {
  path: string;
  label: string;
  text: string;
  clearable: boolean;
}

export function editableFields(type: DocumentType, content: DocumentContent): EditableField[] {
  const fields: EditableField[] = [];
  const add = (path: string, label: string, text: string | null, clearable = false) => {
    fields.push({ path, label, text: text ?? "", clearable });
  };
  if (type === "resume") {
    const resume = content as ResumeContent;
    add("header.headline", "headline", resume.header.headline, true);
    if (resume.summary) add("summary", "summary", resume.summary.text);
    resume.sections.forEach((section, i) =>
      section.entries.forEach((entry, j) => {
        const path = `sections.${i}.entries.${j}`;
        const suffix = `of ${entry.heading}`;
        if (section.kind === "skills" || section.kind === "education") {
          add(
            `${path}.heading`,
            `${section.kind === "skills" ? "skill group" : "institution"} ${suffix}`,
            entry.heading,
          );
        }
        add(
          `${path}.subheading`,
          `${section.kind === "skills" ? "skills" : "subtitle"} ${suffix}`,
          entry.subheading,
          true,
        );
        if (section.kind === "education") {
          add(`${path}.dateRange`, `dates ${suffix}`, entry.dateRange, true);
          add(`${path}.location`, `location ${suffix}`, entry.location, true);
        }
        entry.bullets.forEach((bullet, k) =>
          add(`${path}.bullets.${k}`, `bullet ${k + 1} ${suffix}`, bullet.text),
        );
      }),
    );
  } else if (type === "cover_letter") {
    const letter = content as CoverLetterContent;
    add("title", "professional title", letter.title ?? null, true);
    add("greeting", "greeting", letter.greeting);
    letter.paragraphs.forEach((p, i) => add(`paragraphs.${i}`, `paragraph ${i + 1}`, p.text));
    add("closing", "closing", letter.closing);
    add("signature", "signature", letter.signature);
  } else {
    const message = content as RecruiterMessageContent;
    add("subject", "subject", message.subject);
    add("body", "message", message.body);
  }
  return fields;
}
