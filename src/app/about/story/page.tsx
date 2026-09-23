import { UserRound } from "lucide-react";
import { requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { ContextForm } from "@/components/ContextForm";
import { saveAboutMe } from "./actions";
export const dynamic = "force-dynamic";
export default async function StoryPage() {
  const profile = await requireProfile();
  return (
    <Column
      icon={<UserRound />}
      title="About me"
      subtitle="Your story, values, and motivation."
      parentHref="/about"
      parentTitle="Profile"
      width="detail"
    >
      <ContextForm
        action={saveAboutMe}
        name="aboutMe"
        label="Your story"
        value={profile.aboutMe}
        version={profile.updatedAt.toISOString()}
        placeholder="What draws you to the work you want to do? Which experiences shaped your values? How do you approach problems? What do you hope to contribute or learn next?"
        helper="Write in your own words. A few paragraphs are enough. This context is shared with the assistant or model when writing a cover letter. Clear the field and save to remove it."
      />
    </Column>
  );
}
