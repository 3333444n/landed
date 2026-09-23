import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  createJobSource,
  listJobSources,
  updateJobSource,
  updateJobSourceLink,
  type JobSourceRecord,
} from "@/modules/jobs";
import { getCurrentProfile } from "@/modules/profile";
import type { Result } from "@/modules/shared/contracts";
import { errorText } from "./serialize";
import type { ToolContext } from "./tools";

export function sourceDetail(source: JobSourceRecord) {
  return {
    id: source.id,
    name: source.name,
    archived: source.archived,
    updated_at: source.updatedAt.toISOString(),
  };
}
export function registerJobSourceTools(server: McpServer, ctx: ToolContext) {
  const wrap =
    <A>(body: (args: A, profileId: string) => Promise<Result<unknown>>) =>
    async (args: A) => {
      try {
        const profile = await getCurrentProfile(ctx.deps);
        if (!profile)
          return {
            isError: true as const,
            content: [{ type: "text" as const, text: "not_found: Create your profile first" }],
          };
        const result = await body(args, profile.id);
        return {
          ...(!result.ok ? { isError: true as const } : {}),
          content: [
            {
              type: "text" as const,
              text: result.ok ? JSON.stringify(result.value) : errorText(result.error),
            },
          ],
        };
      } catch {
        return {
          isError: true as const,
          content: [
            { type: "text" as const, text: "internal: Landed could not complete the operation" },
          ],
        };
      }
    };
  server.registerTool(
    "list_job_sources",
    {
      title: "List Job Sources",
      description:
        "Lists active and archived user-defined job sources, including version timestamps.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrap(async (_, profileId) => ({
      ok: true,
      value: { sources: (await listJobSources(ctx.deps, profileId)).map(sourceDetail) },
    })),
  );
  server.registerTool(
    "add_job_source",
    {
      title: "Add job source",
      description: "Creates a source. Mint a source_id and reuse it for retries.",
      inputSchema: z.object({ source_id: z.uuid(), name: z.string() }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrap(async ({ source_id, name }, profileId) => {
      const r = await createJobSource(ctx.deps, profileId, { id: source_id, name });
      return r.ok ? { ok: true, value: sourceDetail(r.value) } : r;
    }),
  );
  server.registerTool(
    "update_job_source",
    {
      title: "Update job source",
      description:
        "Rename, archive or restore a source using its current updated_at; omitted fields stay unchanged.",
      inputSchema: z.object({
        source_id: z.uuid(),
        expected_updated_at: z.iso.datetime(),
        name: z.string().optional(),
        archived: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    wrap(async ({ source_id, expected_updated_at, name, archived }, profileId) => {
      const r = await updateJobSource(ctx.deps, profileId, source_id, {
        expectedUpdatedAt: expected_updated_at,
        name,
        archived,
      });
      return r.ok ? { ok: true, value: sourceDetail(r.value) } : r;
    }),
  );
  server.registerTool(
    "set_job_source",
    {
      title: "Set job source",
      description:
        "Assigns an active source or clears it with null. Requires the job's current updated_at.",
      inputSchema: z.object({
        job_id: z.uuid(),
        expected_updated_at: z.iso.datetime(),
        job_source_id: z.uuid().nullable(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    wrap(async ({ job_id, expected_updated_at, job_source_id }, profileId) => {
      const r = await updateJobSourceLink(ctx.deps, profileId, job_id, {
        expectedUpdatedAt: expected_updated_at,
        jobSourceId: job_source_id,
      });
      return r.ok
        ? {
            ok: true,
            value: {
              job_id: r.value.id,
              job_source_id: r.value.jobSourceId,
              updated_at: r.value.updatedAt.toISOString(),
            },
          }
        : r;
    }),
  );
}
