import { expect, it } from "vitest";
import { demoSnapshot, readFixture } from "../../../tests/helpers/demo-snapshot";
import type { ResumeContent } from "./contracts";
import { resumeContacts } from "./contacts";

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
