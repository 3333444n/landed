import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { buildMcpHandler } from "@/app/mcp/handler";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import type { DatabaseConnection } from "@/infrastructure/database";
import { createProfile, patchProfile, updateProfile } from "@/modules/profile";
import { getApplicationForJob, updateApplication, updateInterest } from "@/modules/applications";
import { pursueJob } from "@/app/jobs/pursue-job";
import { openTestDatabase, truncateAll } from "../helpers/test-database";
let connection: DatabaseConnection;
const deps = () => ({ db: connection.db });
function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
}
beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await connection.close();
});
beforeEach(async () => {
  await truncateAll(connection);
});
it("About me updates preserve general info and stale writes fail", async () => {
  const profile = unwrap(await createProfile(deps(), { displayName: "Alex Rivera" }));
  const saved = unwrap(
    await patchProfile(deps(), profile.id, {
      expectedUpdatedAt: profile.updatedAt.toISOString(),
      aboutMe: "I enjoy making complicated processes understandable.",
    }),
  );
  expect(saved.displayName).toBe(profile.displayName);
  expect(
    (
      await patchProfile(deps(), profile.id, {
        expectedUpdatedAt: profile.updatedAt.toISOString(),
        aboutMe: null,
      })
    ).ok,
  ).toBe(false);
  const general = unwrap(
    await updateProfile(deps(), profile.id, {
      expectedUpdatedAt: saved.updatedAt.toISOString(),
      displayName: "Alex Rivera",
      headline: "Developer",
    }),
  );
  expect(general.aboutMe).toBe(saved.aboutMe);
  const cleared = unwrap(
    await patchProfile(deps(), profile.id, {
      expectedUpdatedAt: general.updatedAt.toISOString(),
      aboutMe: null,
    }),
  );
  expect(cleared.aboutMe).toBeNull();
  expect(cleared.headline).toBe("Developer");
});
it("Interest changes preserve status and notes, and reject stale or foreign writes", async () => {
  const profile = unwrap(await createProfile(deps(), { displayName: "Alex Rivera" }));
  const job = unwrap(
    await pursueJob(deps(), profile.id, {
      title: "Developer",
      companyName: "Example Studio",
      rawDescription: "Build useful tools.",
    }),
  );
  const application = (await getApplicationForJob(deps(), profile.id, job.id))!;
  const status = unwrap(
    await updateApplication(deps(), profile.id, application.id, {
      expectedUpdatedAt: application.updatedAt.toISOString(),
      status: "ready",
      notes: "Review tomorrow",
    }),
  );
  const saved = unwrap(
    await updateInterest(deps(), profile.id, application.id, {
      expectedUpdatedAt: status.updatedAt.toISOString(),
      interest: "Their reporting workflow connects with work I have done.",
    }),
  );
  expect(saved.status).toBe("ready");
  expect(saved.notes).toBe("Review tomorrow");
  expect(
    (
      await updateInterest(deps(), profile.id, application.id, {
        expectedUpdatedAt: status.updatedAt.toISOString(),
        interest: null,
      })
    ).ok,
  ).toBe(false);
  expect(
    (
      await updateInterest(deps(), "10000000-0000-4000-8000-000000000099", application.id, {
        expectedUpdatedAt: saved.updatedAt.toISOString(),
        interest: null,
      })
    ).ok,
  ).toBe(false);
  expect(
    unwrap(
      await updateInterest(deps(), profile.id, application.id, {
        expectedUpdatedAt: saved.updatedAt.toISOString(),
        interest: "  ",
      }),
    ).interest,
  ).toBeNull();
});

it("round-trips narratives through MCP and rejects stale application versions", async () => {
  const profile = unwrap(await createProfile(deps(), { displayName: "Alex Example" }));
  const job = unwrap(
    await pursueJob(deps(), profile.id, {
      title: "Developer",
      companyName: "Example Studio",
      rawDescription: "Build useful tools.",
    }),
  );
  const handler = buildMcpHandler({
    deps: deps(),
    artifactDir: "/tmp/unused-context-test",
    origin: "http://127.0.0.1:3417",
    userAgent: "context-test",
  });
  const client = new Client({ name: "context-test", version: "1" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://127.0.0.1:3417/mcp"), {
      fetch: (input, init) => handler.fetch(new Request(input, init)),
    }),
  );
  async function call<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const response = await client.callTool({ name, arguments: args });
    expect(response.isError).not.toBe(true);
    return JSON.parse((response.content as { text: string }[])[0]!.text) as T;
  }
  try {
    await call("update_profile", {
      expected_updated_at: profile.updatedAt.toISOString(),
      changes: { about_me: "I enjoy explaining complex systems." },
    });
    const read = await call<{ about_me: { text: string | null; updated_at: string } }>(
      "get_profile",
      { sections: ["about_me"] },
    );
    expect(read.about_me.text).toBe("I enjoy explaining complex systems.");
    await call("update_profile", {
      expected_updated_at: read.about_me.updated_at,
      changes: { about_me: null },
    });
    expect(
      (await call<typeof read>("get_profile", { sections: ["about_me"] })).about_me.text,
    ).toBeNull();
    const detail = await call<{ application: { updated_at: string } }>("get_job", {
      job_id: job.id,
    });
    const saved = await call<{ interest: string | null; updated_at: string }>(
      "update_job_interest",
      {
        job_id: job.id,
        expected_updated_at: detail.application.updated_at,
        interest: "The reporting work fits my interests.",
      },
    );
    expect(saved.interest).toBe("The reporting work fits my interests.");
    const stale = await client.callTool({
      name: "update_job_interest",
      arguments: {
        job_id: job.id,
        expected_updated_at: detail.application.updated_at,
        interest: null,
      },
    });
    expect(stale.isError).toBe(true);
    expect(
      (
        await call<typeof saved>("update_job_interest", {
          job_id: job.id,
          expected_updated_at: saved.updated_at,
          interest: null,
        })
      ).interest,
    ).toBeNull();
  } finally {
    await client.close();
  }
});
