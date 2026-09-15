"use client";

import { useActionState, useEffect, useState } from "react";
import { idleState, type ActionState } from "@/app/form-state";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";
import fieldStyles from "@/components/Field.module.css";
import {
  warningLabels,
  type CoverLetterContent,
  type DocumentContent,
  type DocumentType,
  type GroundingWarning,
  type RecruiterMessageContent,
  type ResumeContent,
} from "@/modules/documents/contracts";
import { CopyButton } from "./CopyButton";
import styles from "./documents.module.css";

interface PreviewProps {
  type: DocumentType;
  content: DocumentContent;
  warnings: GroundingWarning[];
  revisionId: string;
  evidence: Record<string, string>;
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
        {content.header.headline ? <p>{content.header.headline}</p> : null}
        {content.header.contact.length > 0 ? (
          <p className={styles.contact}>{content.header.contact.join(" · ")}</p>
        ) : null}
      </div>
      {content.summary ? (
        <Unit ctx={ctx} path="summary" label="summary" unit={content.summary} />
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
                  <span className={styles.heading}>{entry.heading}</span>
                  {entry.dateRange ? (
                    <span className={styles.dateRange}>{entry.dateRange}</span>
                  ) : null}
                </div>
                {entry.subheading ? <p className={styles.subheading}>{entry.subheading}</p> : null}
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
  return (
    <div className={styles.preview}>
      <p className="body-lg">{content.greeting},</p>
      {content.paragraphs.map((paragraph, i) => (
        <Unit
          key={i}
          ctx={ctx}
          path={`paragraphs.${i}`}
          label={`paragraph ${i + 1}`}
          unit={paragraph}
        />
      ))}
      <p className="body-lg">{content.closing},</p>
      <p className="body-lg">{content.signature}</p>
    </div>
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
}: {
  ctx: Ctx;
  path: string;
  label: string;
  unit: { text: string; evidenceIds: string[] };
  showEvidence?: boolean;
}) {
  const warnings = ctx.warnings.filter((w) => w.path === path);
  if (ctx.editing === path) {
    return (
      <UnitEditor
        ctx={ctx}
        path={path}
        label={label}
        text={unit.text}
        onDone={() => ctx.setEditing(null)}
      />
    );
  }
  const cited = unit.evidenceIds.map((id) => ctx.evidence[id] ?? `Unknown record ${id}`);
  return (
    <div className={styles.unit}>
      <button
        type="button"
        className={styles.unitText}
        aria-label={`Edit ${label}`}
        onClick={() => ctx.setEditing(path)}
      >
        {unit.text}
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
  onDone,
}: {
  ctx: Ctx;
  path: string;
  label: string;
  text: string;
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
      <AutoGrowTextarea
        name="text"
        aria-label={`Text of ${label}`}
        className={fieldStyles.control}
        rows={4}
        defaultValue={text}
        autoFocus
      />
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
