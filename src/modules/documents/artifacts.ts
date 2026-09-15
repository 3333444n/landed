/*
 * PDF artifacts (docs/04, docs/05): the file is written atomically (temporary name, then rename)
 * under the artifact directory, and only then the metadata row is inserted. A row without a
 * file, or a file without a row, is reconciled by rendering again on the next download.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Result } from "@/modules/shared/contracts";
import { mapDatabaseError, newId, notFound, now, type BaseDeps } from "@/modules/shared/service";
import type { CoverLetterContent, ResumeContent } from "./contracts";
import { letterHeaderFrom, renderCoverLetterPdf, renderResumePdf, templateVersion } from "./pdf";
import * as repo from "./repository";

export interface RenderedArtifact {
  bytes: Buffer;
  filename: string;
  reused: boolean;
}

/**
 * Returns the PDF for a revision, rendering and storing it once per template version. Only the
 * resume and the cover letter have PDFs; the recruiter message is copied as text.
 */
export async function getOrRenderPdf(
  deps: BaseDeps,
  profileId: string,
  revisionId: string,
  artifactDir: string,
  jobLabel: string,
): Promise<Result<RenderedArtifact>> {
  const revision = await repo.findRevision(deps.db, profileId, revisionId);
  if (!revision) return notFound("Revision");
  const [document] = await repo.listDocumentsForApplicationsById(deps.db, profileId, [
    revision.documentId,
  ]);
  if (!document) return notFound("Document");
  if (document.type === "recruiter_message") {
    return { ok: false, error: { kind: "conflict", message: "Recruiter messages have no PDF" } };
  }
  const run = revision.generationRunId
    ? await repo.findRun(deps.db, profileId, revision.generationRunId)
    : null;
  const name = run?.snapshot.profile.displayName ?? "resume";
  const filename = `${slug(name)}-${slug(jobLabel)}-${document.type === "resume" ? "resume" : "cover-letter"}.pdf`;

  const existing = await repo.findArtifact(deps.db, profileId, revisionId, "pdf", templateVersion);
  if (existing) {
    try {
      const bytes = await readFile(path.join(artifactDir, existing.storageKey));
      if (sha256(bytes) === existing.checksum)
        return { ok: true, value: { bytes, filename, reused: true } };
    } catch {
      // Missing file: fall through and render again into the same key.
    }
  }

  const bytes =
    document.type === "resume"
      ? await renderResumePdf(revision.content as ResumeContent)
      : await renderCoverLetterPdf(
          revision.content as CoverLetterContent,
          letterHeaderFrom(
            run?.snapshot ??
              ({
                profile: { displayName: name, phone: null, email: null, location: null, links: [] },
              } as never),
            now(deps),
          ),
        );
  const storageKey =
    existing?.storageKey ?? path.join(profileId, `${revisionId}-pdf-v${templateVersion}.pdf`);
  const target = path.join(artifactDir, storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${newId(deps)}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, target);

  if (!existing) {
    try {
      await repo.insertArtifact(deps.db, {
        id: newId(deps),
        profileId,
        documentRevisionId: revisionId,
        format: "pdf",
        templateVersion,
        storageKey,
        checksum: sha256(bytes),
        byteSize: bytes.byteLength,
        createdAt: now(deps),
      });
    } catch (error) {
      // A concurrent download inserted the row first: the file is identical, keep going.
      const mapped = await mapDatabaseError<null>(error, async () => null).catch(() => null);
      if (mapped && mapped.ok) throw error;
    }
  }
  return { ok: true, value: { bytes, filename, reused: false } };
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "document"
  );
}
