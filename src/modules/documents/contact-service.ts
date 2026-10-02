import { z } from "zod";
import { contentSchemas, resumeContactSelection } from "./contracts";
import { selectedResumeContacts } from "./contacts";
import { groundingCheck, layoutCheck } from "./rules";
import * as repo from "./repository";
import { fieldErrorsFromZod, type Result } from "@/modules/shared/contracts";
import {
  mapDatabaseError,
  newId,
  notFound,
  now,
  stale,
  validation,
  type BaseDeps,
} from "@/modules/shared/service";
export const setResumeContactsInput = z.strictObject({
  expectedRevisionId: z.uuid(),
  selection: resumeContactSelection,
});
export async function setResumeContacts(
  deps: BaseDeps,
  profileId: string,
  rawInput: unknown,
): Promise<Result<repo.DocumentRevisionRecord>> {
  const parsed = setResumeContactsInput.safeParse(rawInput);
  if (!parsed.success) return validation(fieldErrorsFromZod(parsed.error));
  const input = parsed.data;
  try {
    return await deps.runInTransaction(async (tx) => {
      const current = await repo.findRevision(tx, profileId, input.expectedRevisionId);
      if (!current) return notFound("Revision");
      const latest = await repo.latestRevision(tx, profileId, current.documentId);
      if (!latest || latest.id !== current.id) return stale();
      const [document] = await repo.listDocumentsForApplicationsById(tx, profileId, [
        current.documentId,
      ]);
      if (document?.type !== "resume")
        return validation({ selection: ["Contact selection is only available for resumes"] });
      const source = current.generationRunId
        ? await repo.findRun(tx, profileId, current.generationRunId)
        : null;
      if (!source)
        return validation({ selection: ["The frozen profile for this resume is unavailable"] });
      const content = contentSchemas.resume.parse(current.content);
      const checked = contentSchemas.resume.safeParse({
        ...content,
        contactSelection: input.selection,
        header: {
          ...content.header,
          contact: selectedResumeContacts(source.snapshot, input.selection).map(
            (item) => item.text,
          ),
        },
      });
      if (!checked.success) return validation(fieldErrorsFromZod(checked.error));
      const created = await repo.insertRevision(tx, {
        id: newId(deps),
        profileId,
        documentId: current.documentId,
        generationRunId: current.generationRunId,
        content: checked.data,
        warnings: [
          ...groundingCheck("resume", checked.data, source.snapshot),
          ...layoutCheck("resume", checked.data),
        ],
        source: "edited",
        reviewedAt: null,
        createdAt: now(deps),
      });
      return { ok: true as const, value: created };
    });
  } catch (error) {
    return mapDatabaseError(error, async () => null);
  }
}
