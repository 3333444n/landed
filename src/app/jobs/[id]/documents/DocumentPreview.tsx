"use client";

import { useActionState, useEffect, useState } from "react";
import { fieldsKey, idleState, type ActionState } from "@/app/form-state";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";
import fieldStyles from "@/components/Field.module.css";
import {
  summaryHeading,
  warningLabels,
  type CoverLetterContent,
  type DocumentContent,
  type DocumentType,
  type GroundingWarning,
  type RecruiterMessageContent,
  type ResumeContent,
  type TextSegment,
  type Snapshot,
} from "@/modules/documents/contracts";
import { CopyButton } from "@/components/CopyButton";
import { editableFields } from "@/modules/documents/rules";
import { letterSalutation, type LetterHeader } from "@/modules/documents/presentation";
import styles from "./documents.module.css";
import { ResumeContactEditor } from "./ResumeContactEditor";
import { type ContactId } from "@/modules/documents/contacts";
import { RichTextEditor } from "./RichTextEditor";
import { formattingSegments, salutationFormattingSegments } from "@/modules/documents/formatting";

interface PreviewProps {
  type: DocumentType;
  content: DocumentContent;
  warnings: GroundingWarning[];
  revisionId: string;
  evidence: Record<string, string>;
  letterHeader?: LetterHeader;
  snapshot: Snapshot | null;
  profileDefault: ContactId[];
  contactAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  editAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
}

/**
 * The review view (DESIGN.md): generated text in body.lg, cited evidence revealed under each
 * unit on hover or focus, warning chips on unsupported claims, and inline editing of every unit.
 * Each save is a new revision; the page re-renders with it and this component remounts.
 */
export function DocumentPreview(props: PreviewProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const ctx = { ...props, editing, setEditing };
  switch (props.type) {
    case "resume":
      return <ResumePreview ctx={ctx} content={props.content as ResumeContent} />;
    case "cover_letter":
      return <CoverLetterPreview ctx={ctx} content={props.content as CoverLetterContent} />;
    case "recruiter_message":
      return <MessagePreview ctx={ctx} content={props.content as RecruiterMessageContent} />;
  }
}

type Ctx = PreviewProps & { editing: string | null; setEditing: (path: string | null) => void };

function ResumePreview({ ctx, content }: { ctx: Ctx; content: ResumeContent }) {
  return (
    <div className={styles.preview}>
      <div>
        <p className={styles.name}>{content.header.name}</p>
        <TextField ctx={ctx} path="header.headline" placeholder="Add headline" />
        {ctx.warnings.some((warning) => warning.path === "header") ? (
          <div className={styles.chips}>
            {ctx.warnings
              .filter((warning) => warning.path === "header")
              .map((warning, index) => (
                <Chip key={index} tone="warning">
                  {warningLabels[warning.kind]}
                </Chip>
              ))}
          </div>
        ) : null}
        <ResumeContactEditor
          content={content}
          snapshot={ctx.snapshot}
          profileDefault={ctx.profileDefault}
          revisionId={ctx.revisionId}
          action={ctx.contactAction}
          open={ctx.editing === "contacts"}
          onOpen={() => ctx.setEditing("contacts")}
          onClose={() => ctx.setEditing(null)}
        />
      </div>
      {content.summary ? (
        <section className={styles.preview}>
          <h3 className={styles.sectionTitle}>{summaryHeading}</h3>
          <Unit ctx={ctx} path="summary" label="summary" unit={content.summary} />
        </section>
      ) : null}
      {content.sections.map((section, i) => (
        <section key={section.kind} className={styles.preview}>
          <h3 className={styles.sectionTitle}>{section.title}</h3>
          {section.entries.map((entry, j) => {
            const entryPath = `sections.${i}.entries.${j}`;
            const entryWarnings = ctx.warnings.filter((w) => w.path === entryPath);
            return (
              <div key={entryPath} className={styles.entry}>
                <div className={styles.entryHead}>
                  {section.kind === "skills" || section.kind === "education" ? (
                    <TextField ctx={ctx} path={`${entryPath}.heading`} className={styles.heading} />
                  ) : (
                    <span className={styles.heading}>{entry.heading}</span>
                  )}
                  {section.kind === "education" ? (
                    <TextField
                      ctx={ctx}
                      path={`${entryPath}.dateRange`}
                      className={styles.dateRange}
                      placeholder="Add dates"
                    />
                  ) : entry.dateRange ? (
                    <span className={styles.dateRange}>{entry.dateRange}</span>
                  ) : null}
                </div>
                <div className={styles.entryHead}>
                  <TextField
                    ctx={ctx}
                    path={`${entryPath}.subheading`}
                    className={styles.subheading}
                    placeholder={section.kind === "skills" ? "Add skills" : "Add subtitle"}
                  />
                  {section.kind === "education" ? (
                    <TextField
                      ctx={ctx}
                      path={`${entryPath}.location`}
                      className={styles.dateRange}
                      placeholder="Add location"
                    />
                  ) : entry.location ? (
                    <span className={styles.dateRange}>{entry.location}</span>
                  ) : null}
                </div>
                {entryWarnings.length > 0 ? (
                  <div className={styles.chips}>
                    {entryWarnings.map((w, k) => (
                      <Chip key={k} tone="warning">
                        {warningLabels[w.kind]}
                      </Chip>
                    ))}
                  </div>
                ) : null}
                {entry.bullets.length > 0 ? (
                  <ul className={styles.bullets}>
                    {entry.bullets.map((bullet, k) => (
                      <li key={k}>
                        <Unit
                          ctx={ctx}
                          path={`${entryPath}.bullets.${k}`}
                          label={`bullet ${k + 1} of ${entry.heading}`}
                          unit={bullet}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function CoverLetterPreview({ ctx, content }: { ctx: Ctx; content: CoverLetterContent }) {
  const header = ctx.letterHeader;
  return (
    <article className={styles.letter} aria-label="Cover letter preview">
      {header ? (
        <>
          <header className={styles.letterhead}>
            <div className={styles.letterIdentity}>
              <p className={styles.letterName}>
                {header.nameLines.map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
              </p>
              <TextField
                ctx={ctx}
                path="title"
                className={styles.letterTitle}
                placeholder="Add professional title"
              />
            </div>
            {header.topContact.length > 0 ? (
              <div className={styles.letterLinks}>
                {header.topContact.map((link, i) => (
                  <p key={i} className={link.strong ? styles.heading : undefined}>
                    {link.href ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.text}
                      </a>
                    ) : (
                      link.text
                    )}
                  </p>
                ))}
              </div>
            ) : null}
          </header>
          <div className={styles.letterRecipient}>
            <div>
              {header.company ? <p className={styles.heading}>{header.company}</p> : null}
              {header?.role ? (
                <p className={styles.letterReference}>
                  Job reference: <em>{header.role}</em>
                </p>
              ) : null}
            </div>
            <p className={styles.letterDate}>{header.date}</p>
          </div>
        </>
      ) : null}
      <div className={styles.letterContent}>
        <div className={styles.letterBody}>
          <TextField ctx={ctx} path="greeting" displayText={letterSalutation(content.greeting)} />
          {content.paragraphs.map((paragraph, i) => (
            <Unit
              key={i}
              ctx={ctx}
              path={`paragraphs.${i}`}
              label={`paragraph ${i + 1}`}
              unit={paragraph}
            />
          ))}
        </div>
        <div className={styles.letterSignature}>
          <TextField ctx={ctx} path="closing" displayText={letterSalutation(content.closing)} />
          <TextField ctx={ctx} path="signature" className={styles.heading} />
        </div>
      </div>
      {header && (header.locationLines.length > 0 || header.footerLinks.length > 0) ? (
        <footer className={styles.letterFooter}>
          <div>
            {header.locationLines.map((line, i) => (
              <p key={i} className={styles.heading}>
                {line}
              </p>
            ))}
          </div>
          <div>
            {header.footerLinks.map((link, i) => (
              <p key={i}>
                {link.href ? (
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.text}
                  </a>
                ) : (
                  link.text
                )}
              </p>
            ))}
          </div>
        </footer>
      ) : null}
    </article>
  );
}

/** Metadata shares the editor without pretending it carries prose citations. */
function TextField({
  ctx,
  path,
  className,
  placeholder,
  displayText,
}: {
  ctx: Ctx;
  path: string;
  className?: string;
  placeholder?: string;
  displayText?: string;
}) {
  const field = editableFields(ctx.type, ctx.content).find((item) => item.path === path);
  if (!field) return null;
  return (
    <Unit
      ctx={ctx}
      path={path}
      label={field.label}
      unit={{ text: field.text, evidenceIds: [] }}
      showEvidence={false}
      className={className}
      placeholder={placeholder}
      displayText={displayText}
      compact
    />
  );
}

function MessagePreview({ ctx, content }: { ctx: Ctx; content: RecruiterMessageContent }) {
  const text = `Subject: ${content.subject}\n\n${content.body}`;
  return (
    <div className={styles.preview}>
      <Unit
        ctx={ctx}
        path="subject"
        label="subject"
        unit={{ text: content.subject, evidenceIds: [] }}
        showEvidence={false}
      />
      <Unit
        ctx={ctx}
        path="body"
        label="message"
        unit={{ text: content.body, evidenceIds: content.evidenceIds }}
      />
      <div className={styles.editorActions}>
        <CopyButton text={text} label="Copy message" />
      </div>
    </div>
  );
}

function Unit({
  ctx,
  path,
  label,
  unit,
  showEvidence = true,
  className,
  placeholder,
  displayText,
  compact = false,
}: {
  ctx: Ctx;
  path: string;
  label: string;
  unit: { text: string; evidenceIds: string[] };
  showEvidence?: boolean;
  className?: string;
  placeholder?: string;
  displayText?: string;
  compact?: boolean;
}) {
  const warnings = ctx.warnings.filter((w) => w.path === path);
  if (ctx.editing === path) {
    return (
      <UnitEditor
        ctx={ctx}
        path={path}
        label={label}
        text={unit.text}
        compact={compact}
        className={className}
        onDone={() => ctx.setEditing(null)}
      />
    );
  }
  const cited = unit.evidenceIds.map((id) => ctx.evidence[id] ?? `Unknown record ${id}`);
  return (
    <div className={`${styles.unit} ${className ?? ""}`}>
      <button
        type="button"
        className={`${styles.unitText} ${compact ? styles.fieldText : ""} ${!unit.text ? styles.emptyField : ""}`}
        aria-label={`Edit ${label}`}
        onClick={() => ctx.setEditing(path)}
      >
        {unit.text ? (
          <FormattedText
            segments={
              displayText !== undefined
                ? salutationFormattingSegments(ctx.content, path, unit.text)
                : formattingSegments(ctx.content, path, unit.text)
            }
          />
        ) : (
          placeholder
        )}
      </button>
      {warnings.length > 0 ? (
        <div className={styles.chips}>
          {warnings.map((w, k) => (
            <Chip key={k} tone="warning">
              {warningLabels[w.kind]}
            </Chip>
          ))}
        </div>
      ) : null}
      {showEvidence ? (
        <p className={styles.evidence}>
          {cited.length > 0 ? `Evidence: ${cited.join("; ")}` : "No evidence cited"}
        </p>
      ) : null}
    </div>
  );
}

function UnitEditor({
  ctx,
  path,
  label,
  text,
  compact,
  className,
  onDone,
}: {
  ctx: Ctx;
  path: string;
  label: string;
  text: string;
  compact: boolean;
  className?: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(ctx.editAction, idleState);
  useEffect(() => {
    if (state.status === "saved") onDone();
  }, [state, onDone]);
  const errors = state.status === "error" ? Object.values(state.fieldErrors).flat() : [];
  return (
    <form action={formAction} className={styles.editor}>
      <input type="hidden" name="expectedRevisionId" value={ctx.revisionId} />
      <input type="hidden" name="path" value={path} />
      {ctx.type === "recruiter_message" ? (
        <AutoGrowTextarea
          key={fieldsKey(state)}
          name="text"
          aria-label={`Text of ${label}`}
          className={fieldStyles.control}
          rows={compact ? 1 : 4}
          defaultValue={state.status === "error" ? state.values.text : text}
          autoFocus
        />
      ) : (
        <RichTextEditor
          key={fieldsKey(state)}
          label={label}
          className={`${compact ? "" : styles.proseEditor} ${className ?? ""}`}
          initialSegments={
            state.status === "error"
              ? submittedSegments(state.values.segments, state.values.text ?? text)
              : formattingSegments(ctx.content, path, text)
          }
          disabled={pending}
        />
      )}
      {errors.length > 0 ? (
        <p className={fieldStyles.error} role="alert">
          {errors.join(" ")}
        </p>
      ) : null}
      <div className={styles.editorActions}>
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function submittedSegments(value: string | undefined, text: string): TextSegment[] {
  if (value) {
    try {
      return JSON.parse(value) as TextSegment[];
    } catch {
      /* Keep plain text when a submitted payload was malformed. */
    }
  }
  return text ? [{ text, marks: [] }] : [];
}

function FormattedText({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((segment, i) => {
        let text = <>{segment.text}</>;
        if (segment.marks.includes("bold")) text = <strong>{text}</strong>;
        if (segment.marks.includes("italic")) text = <em>{text}</em>;
        if (segment.marks.includes("underline")) text = <u>{text}</u>;
        return <span key={i}>{text}</span>;
      })}
    </>
  );
}
