import Link from "next/link";
import { deps } from "@/app/current-profile";
import { getModelStatus } from "@/infrastructure/server";
import { Chip } from "@/components/Chip";
import { Column, EmptyState } from "@/components/Column";
import { Toolbar } from "@/components/Toolbar";
import { failureLabels, getRun, type DocumentType } from "@/modules/documents";
import { editUnitAction, generateDocumentAction, markReviewedAction } from "../document-actions";
import { ActionButton } from "./ActionButton";
import { DocumentPreview } from "./DocumentPreview";
import { loadDocument } from "./load";
import { evidenceLabels, runSummary } from "./summary";
import styles from "./documents.module.css";

/**
 * The review column for one document (docs/01 Phase 1b). Generate calls the configured adapter;
 * Paste back, Evidence and Runs are sibling columns; text is edited in place on the preview.
 */
export async function DocumentColumn({ jobId, type }: { jobId: string; type: DocumentType }) {
  const { profile, job, view, href, label } = await loadDocument(jobId, type);
  const status = getModelStatus();
  const canGenerate = status.kind === "configured" || status.kind === "fake";
  const revision = view.revision;
  const run = revision?.generationRunId
    ? await getRun(deps(), profile.id, revision.generationRunId)
    : view.latestRun;
  const evidence = run ? evidenceLabels(run.snapshot) : {};

  return (
    <Column
      title={label}
      subtitle={`${job.title} · ${runSummary(view)}`}
      parentHref={`/jobs/${job.id}`}
      parentTitle={job.title}
      width="detail"
      toolbar={
        <Toolbar
          left={
            <>
              {canGenerate ? (
                <ActionButton
                  action={generateDocumentAction.bind(null, job.id, type)}
                  label={revision ? "Regenerate" : "Generate"}
                  pendingLabel="Generating"
                />
              ) : (
                <Link href="/settings/model" className={styles.toolbarLink}>
                  Set up a model
                </Link>
              )}
              <Link href={`${href}/paste`} className={styles.toolbarLink}>
                Paste back
              </Link>
              {revision && type !== "recruiter_message" ? (
                <a href={`${href}/pdf`} className={styles.toolbarLink}>
                  Download PDF
                </a>
              ) : null}
              {revision ? (
                <ActionButton
                  action={markReviewedAction.bind(null, revision.id, !revision.reviewedAt)}
                  label={revision.reviewedAt ? "Mark unreviewed" : "Mark reviewed"}
                  pendingLabel="Saving"
                  variant="secondary"
                />
              ) : null}
            </>
          }
          right={
            <>
              <Link href={`${href}/evidence`} className={styles.toolbarLink}>
                Evidence
              </Link>
              <Link href={`${href}/runs`} className={styles.toolbarLink}>
                Runs
              </Link>
            </>
          }
        />
      }
    >
      {view.latestRun?.state === "failed" && view.latestRun.failureKind ? (
        <div className={styles.chips}>
          <Chip tone="warning">{failureLabels[view.latestRun.failureKind]}</Chip>
        </div>
      ) : null}
      {revision ? (
        <DocumentPreview
          key={revision.id}
          type={type}
          content={revision.content}
          warnings={revision.warnings}
          revisionId={revision.id}
          evidence={evidence}
          editAction={editUnitAction}
        />
      ) : (
        <EmptyState>
          {canGenerate
            ? "Nothing generated yet. Generate it with the configured model or paste an answer back."
            : "Nothing generated yet. Set up a model in Settings, or paste an answer back from any assistant."}
        </EmptyState>
      )}
    </Column>
  );
}
