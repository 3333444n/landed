import Link from "next/link";
import {
  Check,
  CircleHelp,
  ClipboardPaste,
  Download,
  RefreshCw,
  Sparkles,
  Settings,
} from "lucide-react";
import { RoundLink } from "@/components/RoundLink";
import { deps } from "@/app/current-profile";
import { getModelStatus } from "@/infrastructure/server";
import { Chip } from "@/components/Chip";
import { Column, EmptyState } from "@/components/Column";
import {
  failureLabels,
  getRun,
  letterHeaderFrom,
  type CoverLetterContent,
  type DocumentType,
} from "@/modules/documents";
import { editUnitAction, generateDocumentAction, markReviewedAction } from "../document-actions";
import { ActionButton } from "./ActionButton";
import { DocumentPreview } from "./DocumentPreview";
import { documentIcons } from "./icons";
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
  const Icon = documentIcons[type];

  return (
    <Column
      icon={<Icon />}
      title={label}
      subtitle={`${job.title} · ${runSummary(view)}`}
      parentHref={`/jobs/${job.id}`}
      parentTitle={job.title}
      width="detail"
      headerAction={
        revision && type !== "recruiter_message" ? (
          <RoundLink href={`${href}/pdf`} label="Download PDF" download>
            <Download />
          </RoundLink>
        ) : undefined
      }
      headerDetails={
        <nav aria-label={`${label} details`} className={styles.detailLinks}>
          <Link href={`${href}/evidence`}>Evidence</Link>
          <Link href={`${href}/runs`}>Runs</Link>
        </nav>
      }
      toolbar={
        <div className={styles.actions}>
          {canGenerate ? (
            <ActionButton
              action={generateDocumentAction.bind(null, job.id, type)}
              label={revision ? "Regenerate" : "Generate"}
              pendingLabel="Generating"
              icon={revision ? <RefreshCw /> : <Sparkles />}
            />
          ) : (
            <Link href="/settings/model" className={styles.toolbarLink}>
              <Settings aria-hidden="true" />
              Set up a model
            </Link>
          )}
          <Link href={`${href}/paste`} className={styles.toolbarLink}>
            <ClipboardPaste aria-hidden="true" />
            Paste back
          </Link>
          {revision ? (
            <ActionButton
              action={markReviewedAction.bind(null, revision.id, !revision.reviewedAt)}
              label={revision.reviewedAt ? "Approved" : "Approve?"}
              pendingLabel="Saving"
              variant="secondary"
              tone={revision.reviewedAt ? "success" : "warning"}
              pressed={!!revision.reviewedAt}
              title={revision.reviewedAt ? "Remove approval" : "Approve this revision"}
              icon={revision.reviewedAt ? <Check /> : <CircleHelp />}
            />
          ) : null}
        </div>
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
          letterHeader={
            type === "cover_letter"
              ? letterHeaderFrom(
                  revision.generationRunId ? (run?.snapshot ?? null) : null,
                  revision.createdAt,
                  (revision.content as CoverLetterContent).signature,
                )
              : undefined
          }
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
