import { deps } from "@/app/current-profile";
import { Column, EmptyState } from "@/components/Column";
import { failureLabels, listRunsForDocument, type DocumentType } from "@/modules/documents";
import { loadDocument } from "./load";
import { formatCost } from "./summary";
import styles from "./documents.module.css";

/** Every model call for this document: the observability view (ADR 006). */
export async function RunsColumn({ jobId, type }: { jobId: string; type: DocumentType }) {
  const { profile, job, application, href, label } = await loadDocument(jobId, type);
  const runs = await listRunsForDocument(deps(), profile.id, application.id, type);

  return (
    <Column
      title="Runs"
      subtitle={`${label} for ${job.title}`}
      parentHref={href}
      parentTitle={label}
      width="detail"
    >
      {runs.length === 0 ? (
        <EmptyState>No runs yet.</EmptyState>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Runs">
            <thead>
              <tr>
                <th>When</th>
                <th>Mode</th>
                <th>Provider</th>
                <th>Prompt</th>
                <th>State</th>
                <th className={styles.num}>Tokens in</th>
                <th className={styles.num}>Tokens out</th>
                <th className={styles.num}>Latency</th>
                <th className={styles.num}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{run.createdAt.toLocaleString("en")}</td>
                  <td>{run.mode === "pasted" ? "Pasted" : "Adapter"}</td>
                  <td>
                    {run.provider}
                    <br />
                    <span className="body-sm text-secondary">{run.model}</span>
                  </td>
                  <td>
                    {run.promptName} v{run.promptVersion}
                  </td>
                  <td>
                    {run.state}
                    {run.state === "failed" && run.failureKind ? (
                      <>
                        <br />
                        <span className="body-sm text-secondary">
                          {failureLabels[run.failureKind]}
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td className={styles.num}>{run.inputTokens ?? "–"}</td>
                  <td className={styles.num}>{run.outputTokens ?? "–"}</td>
                  <td className={styles.num}>
                    {run.latencyMs === null ? "–" : `${run.latencyMs} ms`}
                  </td>
                  <td className={styles.num}>{formatCost(run.costUsd) ?? "not reported"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Column>
  );
}
