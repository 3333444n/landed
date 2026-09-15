import { ListChecks } from "lucide-react";
import { deps } from "@/app/current-profile";
import { Column, EmptyState } from "@/components/Column";
import { contentUnits, getRun, type DocumentType, type Snapshot } from "@/modules/documents";
import { loadDocument } from "./load";
import styles from "./documents.module.css";

/** The career records the latest revision cites, grouped by kind (DESIGN.md "Review view"). */
export async function EvidenceColumn({ jobId, type }: { jobId: string; type: DocumentType }) {
  const { profile, job, view, href, label } = await loadDocument(jobId, type);
  const revision = view.revision;
  const run = revision?.generationRunId
    ? await getRun(deps(), profile.id, revision.generationRunId)
    : null;

  return (
    <Column
      icon={<ListChecks />}
      title="Evidence"
      subtitle={`${label} for ${job.title}`}
      parentHref={href}
      parentTitle={label}
      width="detail"
    >
      {!revision || !run ? (
        <EmptyState>Nothing to show until a document exists.</EmptyState>
      ) : (
        <Groups snapshot={run.snapshot} cited={citedIds(type, revision.content)} />
      )}
    </Column>
  );
}

function citedIds(type: DocumentType, content: Parameters<typeof contentUnits>[1]): Set<string> {
  return new Set(contentUnits(type, content).flatMap((u) => u.evidenceIds));
}

function Groups({ snapshot, cited }: { snapshot: Snapshot; cited: Set<string> }) {
  const groups: { title: string; items: { id: string; text: string; detail?: string }[] }[] = [
    {
      title: "Work history",
      items: snapshot.employment.map((e) => ({
        id: e.id,
        text: `${e.role} at ${e.employerName}`,
        detail: e.description ?? undefined,
      })),
    },
    {
      title: "Projects",
      items: snapshot.projects.map((p) => ({
        id: p.id,
        text: p.name,
        detail: p.description ?? undefined,
      })),
    },
    {
      title: "Education",
      items: snapshot.education.map((e) => ({
        id: e.id,
        text: e.institution,
        detail: [e.qualification, e.subject].filter(Boolean).join(", ") || undefined,
      })),
    },
    { title: "Skills", items: snapshot.skills.map((s) => ({ id: s.id, text: s.displayName })) },
    {
      title: "Achievements",
      items: snapshot.achievements.map((a) => ({
        id: a.id,
        text: a.statement,
        detail: [a.result, a.metric].filter(Boolean).join(" · ") || undefined,
      })),
    },
    { title: "Profile", items: [{ id: snapshot.profile.id, text: snapshot.profile.displayName }] },
  ]
    .map((g) => ({ ...g, items: g.items.filter((i) => cited.has(i.id)) }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return <EmptyState>The document cites none of your records.</EmptyState>;
  }
  return (
    <>
      {groups.map((group) => (
        <section key={group.title} className={styles.group}>
          <h3 className="title-md">{group.title}</h3>
          <ul className={styles.evidenceList}>
            {group.items.map((item) => (
              <li key={item.id} id={item.id}>
                <p>{item.text}</p>
                {item.detail ? <p className="body-sm text-secondary">{item.detail}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
