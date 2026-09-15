import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseConnection } from "@/infrastructure/database";
import { FakeModelAdapter, fakeMarkers } from "@/infrastructure/model";
import {
  generateDocument,
  prepareGeneration,
  preparePasteBack,
} from "@/app/jobs/generate-document";
import { listJobRows } from "@/app/jobs/list-jobs";
import { pursueJob } from "@/app/jobs/pursue-job";
import { getApplicationForJob } from "@/modules/applications";
import {
  editUnit,
  getDocumentView,
  getRun,
  listRunsForDocument,
  markReviewed,
  startRun,
  submitPastedAnswer,
  sweepInterruptedRuns,
  type ResumeContent,
} from "@/modules/documents";
import { documentRevisions, documents, generationRuns } from "@/modules/documents/schema";
import { deleteJob } from "@/modules/jobs";
import {
  createAchievement,
  createProfile,
  saveEducation,
  saveEmployment,
  saveProject,
  saveSkill,
  updateProfile,
} from "@/modules/profile";
import { openTestDatabase, truncateAll } from "../helpers/test-database";

// Values from examples/demo-profile.json (fictional); the fixtures cite these ids.
const demo = {
  profileId: "10000000-0000-4000-8000-000000000001",
  employmentId: "20000000-0000-4000-8000-000000000001",
  educationId: "30000000-0000-4000-8000-000000000001",
  projectId: "40000000-0000-4000-8000-000000000001",
  achievementIds: [
    "50000000-0000-4000-8000-000000000001",
    "50000000-0000-4000-8000-000000000002",
    "50000000-0000-4000-8000-000000000003",
  ],
  skillIds: ["60000000-0000-4000-8000-000000000001", "60000000-0000-4000-8000-000000000002"],
  jobId: "70000000-0000-4000-8000-000000000001",
  job: {
    title: "Full-stack developer",
    companyName: "Example Analytics",
    location: "Remote",
    rawDescription:
      "Example Analytics is looking for a full-stack developer to build internal reporting tools.\n\nYou will work with PostgreSQL and TypeScript.",
  },
};

let connection: DatabaseConnection;
const deps = () => ({ db: connection.db });
const fake = new FakeModelAdapter();
const fixture = (name: string) => readFileSync(`examples/generation/fixtures/${name}.json`, "utf8");

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

async function seedProfile() {
  unwrap(await createProfile(deps(), { id: demo.profileId, displayName: "Alex Rivera" }));
  unwrap(
    await updateProfile(deps(), demo.profileId, {
      displayName: "Alex Rivera",
      headline: "Software developer",
      email: "alex@example.com",
      location: "Mexico City",
      summary: "Builds internal tools and accessible web interfaces.",
    }),
  );
  unwrap(
    await saveEmployment(deps(), demo.profileId, {
      id: demo.employmentId,
      employerName: "Example Workshop",
      role: "Software developer",
      startYear: "2023",
      startMonth: "4",
      endYear: "2025",
      endMonth: "6",
    }),
  );
  unwrap(
    await saveEducation(deps(), demo.profileId, {
      id: demo.educationId,
      institution: "Example Learning Institute",
      qualification: "Web development certificate",
      subject: "Software development",
      status: "completed",
    }),
  );
  unwrap(
    await saveProject(deps(), demo.profileId, {
      id: demo.projectId,
      name: "Community Tool Library",
      description: "A volunteer project for tracking borrowed tools.",
    }),
  );
  unwrap(
    await saveSkill(deps(), demo.profileId, { id: demo.skillIds[0], displayName: "PostgreSQL" }),
  );
  unwrap(
    await saveSkill(deps(), demo.profileId, {
      id: demo.skillIds[1],
      displayName: "Web accessibility",
    }),
  );
  unwrap(
    await createAchievement(deps(), demo.profileId, {
      id: demo.achievementIds[0],
      employmentId: demo.employmentId,
      statement:
        "Reduced weekly report preparation from four hours to one by building a PostgreSQL-backed reporting tool.",
      problem: "Manual preparation of weekly reports.",
      action: "Built a reporting tool with reusable SQL queries.",
      result: "Weekly preparation took one hour.",
      metric: "4 hours to 1 hour per week",
      skillIds: [demo.skillIds[0]],
    }),
  );
  unwrap(
    await createAchievement(deps(), demo.profileId, {
      id: demo.achievementIds[1],
      projectId: demo.projectId,
      statement: "Implemented keyboard-accessible forms for recording tool loans.",
      skillIds: [demo.skillIds[1]],
    }),
  );
  unwrap(
    await createAchievement(deps(), demo.profileId, {
      id: demo.achievementIds[2],
      statement: "Documented a local development setup for a volunteer team.",
    }),
  );
}

async function pasteJob(description = demo.job.rawDescription) {
  const job = unwrap(
    await pursueJob(deps(), demo.profileId, {
      id: demo.jobId,
      ...demo.job,
      rawDescription: description,
    }),
  );
  const application = (await getApplicationForJob(deps(), demo.profileId, job.id))!;
  return { job, application };
}

async function chip() {
  const rows = await listJobRows(deps(), demo.profileId);
  return rows[0]!.derived;
}

beforeAll(async () => {
  connection = await openTestDatabase();
});
afterAll(async () => {
  await connection.close();
});
beforeEach(async () => {
  await truncateAll(connection);
  await seedProfile();
});

describe("generateDocument with the fake adapter", () => {
  it("records a succeeded run and a generated revision with no warnings", async () => {
    const { application } = await pasteJob();
    expect((await chip()).chip.label).toBe("Preparing");

    const run = unwrap(await generateDocument(deps(), fake, demo.profileId, demo.jobId, "resume"));
    expect(run.state).toBe("succeeded");
    expect(run.mode).toBe("adapter");
    expect(run.provider).toBe("fake");
    expect(run.promptName).toBe("resume");
    expect(run.promptVersion).toBe(1);
    expect(run.inputTokens).toBe(1200);
    expect(run.outputTokens).toBe(400);
    expect(run.costUsd).toBeNull();
    expect(run.latencyMs).not.toBeNull();
    expect(run.startedAt).not.toBeNull();
    expect(run.finishedAt).not.toBeNull();
    expect(run.snapshot.job.title).toBe(demo.job.title);
    expect(run.snapshot.achievements).toHaveLength(3);

    const view = await getDocumentView(deps(), demo.profileId, application.id, "resume");
    expect(view.document?.type).toBe("resume");
    expect(view.revision?.source).toBe("generated");
    expect(view.revision?.generationRunId).toBe(run.id);
    expect(view.revision?.reviewedAt).toBeNull();
    expect(view.warnings).toEqual([]);
    expect(view.latestRun?.id).toBe(run.id);
    expect((view.revision?.content as ResumeContent).header.name).toBe("Alex Rivera");

    expect(await chip()).toEqual({ chip: { label: "Needs review", tone: "warning" } });
  });

  it("saves the revision with every warning kind when the answer is ungrounded", async () => {
    const { application } = await pasteJob(`${demo.job.rawDescription}\n${fakeMarkers.ungrounded}`);
    const run = unwrap(await generateDocument(deps(), fake, demo.profileId, demo.jobId, "resume"));
    expect(run.state).toBe("succeeded");
    const view = await getDocumentView(deps(), demo.profileId, application.id, "resume");
    expect(view.revision).not.toBeNull();
    expect([...new Set(view.warnings.map((w) => w.kind))].sort()).toEqual([
      "no_evidence",
      "unknown_evidence",
      "unknown_heading",
      "unsupported_number",
    ]);
  });

  it("keeps the previous revision when the answer fails validation", async () => {
    const { application } = await pasteJob();
    const good = unwrap(await generateDocument(deps(), fake, demo.profileId, demo.jobId, "resume"));
    const before = await getDocumentView(deps(), demo.profileId, application.id, "resume");

    // The posting is untrusted input; the marker makes the fake adapter misbehave.
    unwrap(
      await (async () => {
        const { saveJob } = await import("@/modules/jobs");
        return saveJob(
          deps(),
          demo.profileId,
          { ...demo.job, rawDescription: `${demo.job.rawDescription}\n${fakeMarkers.invalid}` },
          demo.jobId,
        );
      })(),
    );
    const bad = unwrap(await generateDocument(deps(), fake, demo.profileId, demo.jobId, "resume"));
    expect(bad.id).not.toBe(good.id);
    expect(bad.state).toBe("failed");
    expect(bad.failureKind).toBe("validation");
    expect(bad.rawOutput).toContain("unexpected");
    expect(bad.errorMessage).not.toContain("Alex");

    const after = await getDocumentView(deps(), demo.profileId, application.id, "resume");
    expect(after.revision?.id).toBe(before.revision?.id);
    expect(after.latestRun?.id).toBe(bad.id);
    const revisions = await connection.db.select().from(documentRevisions);
    expect(revisions).toHaveLength(1);

    expect(await chip()).toEqual({
      chip: { label: "Needs review", tone: "warning" },
      modifier: { label: "Generation failed", tone: "warning" },
    });
  });

  it("leaves a sibling document intact when the provider fails", async () => {
    const { application } = await pasteJob();
    unwrap(await generateDocument(deps(), fake, demo.profileId, demo.jobId, "resume"));
    const { saveJob } = await import("@/modules/jobs");
    unwrap(
      await saveJob(
        deps(),
        demo.profileId,
        { ...demo.job, rawDescription: `${demo.job.rawDescription}\n${fakeMarkers.providerError}` },
        demo.jobId,
      ),
    );
    const failed = unwrap(
      await generateDocument(deps(), fake, demo.profileId, demo.jobId, "cover_letter"),
    );
    expect(failed.state).toBe("failed");
    expect(failed.failureKind).toBe("provider");
    expect(failed.errorMessage).toBe("FakeProviderError (HTTP 503)");
    expect(failed.rawOutput).toBeNull();

    const resume = await getDocumentView(deps(), demo.profileId, application.id, "resume");
    expect(resume.revision?.source).toBe("generated");
    const letter = await getDocumentView(deps(), demo.profileId, application.id, "cover_letter");
    expect(letter.document).toBeNull();
    expect(letter.revision).toBeNull();
    expect(letter.latestRun?.id).toBe(failed.id);
  });
});

describe("sweepInterruptedRuns", () => {
  it("fails runs left running past the limit and leaves fresh ones", async () => {
    const { application } = await pasteJob();
    const { snapshot } = unwrap(await prepareGeneration(deps(), demo.profileId, demo.jobId));
    const identity = (type: "resume" | "cover_letter") => ({
      applicationId: application.id,
      documentType: type,
      snapshot,
      mode: "adapter" as const,
      provider: "fake",
      model: "fixtures",
    });
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);
    const old = await startRun(
      { ...deps(), now: () => elevenMinutesAgo },
      demo.profileId,
      identity("resume"),
    );
    const fresh = await startRun(deps(), demo.profileId, identity("cover_letter"));
    expect(old.state).toBe("running");

    expect(await sweepInterruptedRuns(deps(), demo.profileId)).toBe(1);
    const swept = (await getRun(deps(), demo.profileId, old.id))!;
    expect(swept.state).toBe("failed");
    expect(swept.failureKind).toBe("interrupted");
    expect(swept.finishedAt).not.toBeNull();
    expect((await getRun(deps(), demo.profileId, fresh.id))?.state).toBe("running");
    expect(await sweepInterruptedRuns(deps(), demo.profileId)).toBe(0);

    // The chip sees the fresh run as Crafting documents.
    expect((await chip()).chip.label).toBe("Crafting documents");
  });

  it("presents an old running run as interrupted in the runs list before any sweep", async () => {
    const { application } = await pasteJob();
    const { snapshot } = unwrap(await prepareGeneration(deps(), demo.profileId, demo.jobId));
    await startRun(
      { ...deps(), now: () => new Date(Date.now() - 11 * 60 * 1000) },
      demo.profileId,
      {
        applicationId: application.id,
        documentType: "resume",
        snapshot,
        mode: "adapter",
        provider: "fake",
        model: "fixtures",
      },
    );
    const runs = await listRunsForDocument(deps(), demo.profileId, application.id, "resume");
    expect(runs[0]).toMatchObject({ state: "failed", failureKind: "interrupted" });
  });
});

describe("editUnit and markReviewed", () => {
  it("creates an edited revision, refuses stale edits and unknown paths", async () => {
    const { application } = await pasteJob();
    unwrap(await generateDocument(deps(), fake, demo.profileId, demo.jobId, "resume"));
    const first = (await getDocumentView(deps(), demo.profileId, application.id, "resume"))
      .revision!;

    const edited = unwrap(
      await editUnit(deps(), demo.profileId, {
        expectedRevisionId: first.id,
        path: "sections.0.entries.0.bullets.0",
        text: "Built a reporting tool that cut weekly preparation from 4 hours to 1.",
      }),
    );
    expect(edited.id).not.toBe(first.id);
    expect(edited.source).toBe("edited");
    expect(edited.generationRunId).toBe(first.generationRunId);
    expect(edited.reviewedAt).toBeNull();
    expect(edited.warnings).toEqual([]);
    expect((edited.content as ResumeContent).sections[0]?.entries[0]?.bullets[0]?.text).toContain(
      "cut weekly preparation",
    );

    const [stored] = await connection.db
      .select()
      .from(documentRevisions)
      .where(eq(documentRevisions.id, first.id));
    expect(stored?.content).toEqual(first.content);

    const view = await getDocumentView(deps(), demo.profileId, application.id, "resume");
    expect(view.revision?.id).toBe(edited.id);

    const stale = await editUnit(deps(), demo.profileId, {
      expectedRevisionId: first.id,
      path: "summary",
      text: "Another edit from an old tab",
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error.kind).toBe("stale");

    const unknown = await editUnit(deps(), demo.profileId, {
      expectedRevisionId: edited.id,
      path: "sections.9.entries.0.bullets.0",
      text: "x",
    });
    expect(unknown).toEqual({
      ok: false,
      error: {
        kind: "validation",
        fieldErrors: { text: ["That part of the document no longer exists"] },
      },
    });

    const tooLong = await editUnit(deps(), demo.profileId, {
      expectedRevisionId: edited.id,
      path: "summary",
      text: "x".repeat(301),
    });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.error.kind).toBe("validation");

    // An edit that invents a number is warned about, not blocked.
    const invented = unwrap(
      await editUnit(deps(), demo.profileId, {
        expectedRevisionId: edited.id,
        path: "summary",
        text: "Served 9,999 analysts.",
      }),
    );
    expect(invented.warnings.map((w) => w.kind)).toEqual(["unsupported_number"]);
  });

  it("marks a revision reviewed and back, and the chip follows", async () => {
    const { application } = await pasteJob();
    unwrap(await generateDocument(deps(), fake, demo.profileId, demo.jobId, "resume"));
    const revision = (await getDocumentView(deps(), demo.profileId, application.id, "resume"))
      .revision!;
    expect((await chip()).chip.label).toBe("Needs review");

    const reviewed = unwrap(await markReviewed(deps(), demo.profileId, revision.id, true));
    expect(reviewed.reviewedAt).not.toBeNull();
    expect((await chip()).chip.label).toBe("Preparing");

    const unreviewed = unwrap(await markReviewed(deps(), demo.profileId, revision.id, false));
    expect(unreviewed.reviewedAt).toBeNull();
    expect((await chip()).chip.label).toBe("Needs review");

    const missing = await markReviewed(deps(), demo.profileId, crypto.randomUUID(), true);
    expect(missing.ok).toBe(false);
  });
});

describe("paste-back", () => {
  it("accepts the fixture JSON, with or without code fences, as a pasted revision", async () => {
    const { application } = await pasteJob();
    const prepared = unwrap(
      await preparePasteBack(deps(), demo.profileId, demo.jobId, "cover_letter"),
    );
    expect(prepared.run.state).toBe("queued");
    expect(prepared.run.mode).toBe("pasted");
    expect(prepared.run.startedAt).toBeNull();
    expect(prepared.instructions).toContain("cover letter");
    expect(prepared.input).toContain("untrusted data");
    // A prompt waiting for a person is not work in progress: the chip stays Preparing.
    expect((await chip()).chip.label).toBe("Preparing");

    // Opening Paste back again supersedes the earlier unanswered prompt.
    const reopened = unwrap(
      await preparePasteBack(deps(), demo.profileId, demo.jobId, "cover_letter"),
    );
    expect((await getRun(deps(), demo.profileId, prepared.run.id))?.state).toBe("cancelled");
    const superseded = await submitPastedAnswer(deps(), demo.profileId, {
      runId: prepared.run.id,
      json: fixture("cover-letter"),
    });
    expect(superseded.ok).toBe(false);
    prepared.run = reopened.run;

    const saved = unwrap(
      await submitPastedAnswer(deps(), demo.profileId, {
        runId: prepared.run.id,
        json: "```json\n" + fixture("cover-letter") + "\n```",
      }),
    );
    expect(saved.run.state).toBe("succeeded");
    expect(saved.run.inputTokens).toBeNull();
    expect(saved.revision.source).toBe("pasted");
    expect(saved.revision.warnings).toEqual([]);
    const view = await getDocumentView(deps(), demo.profileId, application.id, "cover_letter");
    expect(view.revision?.id).toBe(saved.revision.id);

    const again = await submitPastedAnswer(deps(), demo.profileId, {
      runId: prepared.run.id,
      json: fixture("cover-letter"),
    });
    expect(again.ok).toBe(false);
    if (!again.ok && again.error.kind === "validation") {
      expect(again.error.fieldErrors.form?.[0]).toContain("already answered");
    }

    const plain = unwrap(await preparePasteBack(deps(), demo.profileId, demo.jobId, "resume"));
    const savedPlain = unwrap(
      await submitPastedAnswer(deps(), demo.profileId, {
        runId: plain.run.id,
        json: fixture("resume"),
      }),
    );
    expect(savedPlain.revision.source).toBe("pasted");
  });

  it("rejects text that is not JSON or not the document shape, failing the run", async () => {
    await pasteJob();
    const notJson = unwrap(await preparePasteBack(deps(), demo.profileId, demo.jobId, "resume"));
    const result = await submitPastedAnswer(deps(), demo.profileId, {
      runId: notJson.run.id,
      json: "Sure! Here is your resume: ...",
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === "validation") {
      expect(result.error.fieldErrors.json?.[0]).toContain("not valid JSON");
    }
    const failed = (await getRun(deps(), demo.profileId, notJson.run.id))!;
    expect(failed.state).toBe("failed");
    expect(failed.failureKind).toBe("pasted_invalid");
    expect(failed.rawOutput).toContain("Sure!");

    const wrongShape = unwrap(await preparePasteBack(deps(), demo.profileId, demo.jobId, "resume"));
    const shape = await submitPastedAnswer(deps(), demo.profileId, {
      runId: wrongShape.run.id,
      json: fixture("cover-letter"),
    });
    expect(shape.ok).toBe(false);
    if (!shape.ok && shape.error.kind === "validation") {
      expect(shape.error.fieldErrors.json?.[0]).toContain("does not match the document shape");
    }
    expect((await getRun(deps(), demo.profileId, wrongShape.run.id))?.failureKind).toBe(
      "pasted_invalid",
    );
    expect(await connection.db.select().from(documentRevisions)).toHaveLength(0);

    const blank = await submitPastedAnswer(deps(), demo.profileId, {
      runId: notJson.run.id,
      json: "",
    });
    expect(blank.ok).toBe(false);
  });
});

describe("deleting a job", () => {
  it("cascades to documents, revisions and runs", async () => {
    await pasteJob();
    unwrap(await generateDocument(deps(), fake, demo.profileId, demo.jobId, "resume"));
    unwrap(await generateDocument(deps(), fake, demo.profileId, demo.jobId, "cover_letter"));
    expect(await connection.db.select().from(generationRuns)).toHaveLength(2);
    expect(await connection.db.select().from(documents)).toHaveLength(2);
    expect(await connection.db.select().from(documentRevisions)).toHaveLength(2);

    unwrap(await deleteJob(deps(), demo.profileId, demo.jobId));
    expect(await connection.db.select().from(generationRuns)).toHaveLength(0);
    expect(await connection.db.select().from(documents)).toHaveLength(0);
    expect(await connection.db.select().from(documentRevisions)).toHaveLength(0);
  });
});

describe("profile links", () => {
  it("save through updateProfile and reach the snapshot", async () => {
    const saved = unwrap(
      await updateProfile(deps(), demo.profileId, {
        displayName: "Alex Rivera",
        linkedinUrl: "https://www.linkedin.com/in/example",
        githubUrl: "https://github.com/example",
        websiteUrl: "",
      }),
    );
    expect(saved.links).toEqual([
      { label: "LinkedIn", url: "https://www.linkedin.com/in/example" },
      { label: "GitHub", url: "https://github.com/example" },
    ]);

    const bad = await updateProfile(deps(), demo.profileId, {
      displayName: "Alex Rivera",
      githubUrl: "github.com/example",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok && bad.error.kind === "validation") {
      expect(bad.error.fieldErrors.githubUrl).toBeDefined();
    }

    await pasteJob();
    const { snapshot } = unwrap(await prepareGeneration(deps(), demo.profileId, demo.jobId));
    expect(snapshot.profile.links).toEqual(saved.links);
  });
});
