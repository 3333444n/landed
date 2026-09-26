import { describe, expect, it } from "vitest";
import { demoSnapshot, readFixture } from "../../../tests/helpers/demo-snapshot";
import type { ResumeContent } from "./contracts";
import {
  contactRowPreview,
  selectedResumeContacts,
  resumeContacts,
  resumeContactSelection,
} from "./contacts";
import { profilePatchInput, updateProfileInput } from "../profile/contracts";

describe("resume contacts", () => {
  const snapshot = demoSnapshot();
  snapshot.profile.phone = "+1 202 555 0100";
  snapshot.profile.links = [{ label: "Website", url: "https://www.example.com/" }];
  it("uses selected order and stable destinations while omitting missing values", () => {
    expect(selectedResumeContacts(snapshot, ["website", "phone", "github"])).toEqual([
      { id: "website", text: "example.com", href: "https://www.example.com/" },
      { id: "phone", text: "+1 202 555 0100", href: "https://wa.me/12025550100" },
    ]);
    expect(selectedResumeContacts(snapshot, [])).toEqual([]);
  });
  it("keeps legacy labels and leaves unrelated contact text unlinked", () => {
    const content = readFixture<ResumeContent>("resume");
    content.header.contact = ["www.example.com", "Unknown contact"];
    expect(resumeContacts(content, snapshot)).toEqual([
      { id: "website", text: "www.example.com", href: "https://www.example.com/" },
      { text: "Unknown contact", href: null },
    ]);
    expect(resumeContactSelection(content, snapshot)).toEqual(["website"]);
  });
  it("keeps selected but unavailable ids for later regeneration", () => {
    const content = {
      ...readFixture<ResumeContent>("resume"),
      contactSelection: ["github", "website"] as const,
    };
    expect(
      resumeContactSelection(
        { ...content, contactSelection: [...content.contactSelection] },
        snapshot,
      ),
    ).toEqual(["github", "website"]);
  });
});

describe("profile resume preferences contract", () => {
  const version = { expectedUpdatedAt: "2026-09-26T12:00:00.000Z" };
  it("distinguishes preserve, clear, and reset", () => {
    expect(profilePatchInput.parse(version).resumeContacts).toBeUndefined();
    expect(profilePatchInput.parse({ ...version, resumeContacts: [] }).resumeContacts).toEqual([]);
    expect(profilePatchInput.parse({ ...version, resumeContacts: null }).resumeContacts).toBeNull();
  });
  it("rejects duplicate ids and unknown contacts", () => {
    expect(
      profilePatchInput.safeParse({ ...version, resumeContacts: ["email", "email"] }).success,
    ).toBe(false);
    expect(profilePatchInput.safeParse({ ...version, resumeContacts: ["custom"] }).success).toBe(
      false,
    );
  });
  it("reads an empty form selection without restoring defaults", () => {
    expect(
      updateProfileInput.parse({ displayName: "Example Person", resumeContacts: "" })
        .resumeContacts,
    ).toEqual([]);
  });
});

describe("contact row preview", () => {
  it("measures shortened web labels and warns without dropping any entries", () => {
    expect(contactRowPreview(["website"], { website: "https://www.example.com/" })).toEqual({
      text: "example.com",
      wraps: false,
    });
    const longEmail = `${"wide".repeat(50)}@example.com`;
    const preview = contactRowPreview(["email", "website"], {
      email: longEmail,
      website: "https://www.example.com/",
    });
    expect(preview).toEqual({ text: `${longEmail} · example.com`, wraps: true });
    expect(contactRowPreview([], { email: longEmail })).toEqual({ text: "", wraps: false });
  });
});

it("links only recognized frozen contacts without changing saved labels or order", () => {
  const snapshot = demoSnapshot();
  snapshot.profile.phone = "+1 202 555 0100";
  snapshot.profile.links = [{ label: "Website", url: "https://www.example.com/" }];
  const content = readFixture<ResumeContent>("resume");
  content.header.contact = ["www.example.com", snapshot.profile.phone, "Unknown contact"];
  expect(resumeContacts(content, snapshot)).toEqual([
    { id: "website", text: "www.example.com", href: "https://www.example.com/" },
    { id: "phone", text: "+1 202 555 0100", href: "https://wa.me/12025550100" },
    { text: "Unknown contact", href: null },
  ]);
  expect(resumeContacts(content, null).map((item) => item.href)).toEqual([null, null, null]);
});
