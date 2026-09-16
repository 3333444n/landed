import { ClipboardPaste } from "lucide-react";
import { deps } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { Field } from "@/components/Field";
import { preparePasteBack } from "../../generate-document";
import { pasteBackAction } from "../document-actions";
import { CopyButton } from "@/components/CopyButton";
import { loadDocument } from "./load";
import { PasteBackForm } from "./PasteBackForm";
import styles from "./documents.module.css";
import type { DocumentType } from "@/modules/documents";

/**
 * Paste-back mode (ADR 006): the app builds the prompt, the user runs it anywhere and pastes the
 * JSON back. Rendering this column freezes a snapshot and opens a queued run each time, which is
 * acceptable in Phase 1b: an unanswered queued run costs nothing and never becomes a revision.
 */
export async function PasteColumn({ jobId, type }: { jobId: string; type: DocumentType }) {
  const { profile, job, href, label } = await loadDocument(jobId, type);
  const prepared = await preparePasteBack(deps(), profile.id, job.id, type);
  if (!prepared.ok) throw new Error("Could not prepare the prompt");
  const prompt = `${prepared.value.instructions}\n\n${prepared.value.input}`;

  return (
    <Column
      icon={<ClipboardPaste />}
      title="Paste back"
      subtitle={`${label} for ${job.title}`}
      parentHref={href}
      parentTitle={label}
      width="detail"
    >
      <p className="text-secondary">
        Copy this prompt into any assistant you already use, then paste its JSON answer below. It is
        checked against your facts the same way a generated answer is.
      </p>
      <Field label="The prompt" name="prompt" multiline rows={12} readOnly defaultValue={prompt} />
      <div className={styles.editorActions}>
        <CopyButton text={prompt} label="Copy prompt" />
      </div>
      <PasteBackForm
        action={pasteBackAction.bind(null, job.id, type)}
        runId={prepared.value.run.id}
      />
    </Column>
  );
}
