import { UserRound } from "lucide-react";
import { requireProfile } from "@/app/current-profile";
import { Column } from "@/components/Column";
import { updateProfileAction } from "./actions";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireProfile();
  const preferences = profile.preferences;

  return (
    <Column
      icon={<UserRound />}
      title="General info"
      subtitle="How you appear on a resume."
      parentHref="/about"
      parentTitle="Profile"
      width="detail"
    >
      <ProfileForm
        action={updateProfileAction}
        record={{
          displayName: profile.displayName,
          headline: profile.headline ?? "",
          summary: profile.summary ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          location: profile.location ?? "",
          desiredRoles: (preferences.desiredRoles ?? []).join(", "),
          locations: (preferences.locations ?? []).join(", "),
          workArrangement: (preferences.workArrangement ?? []).join(","),
          constraints: preferences.constraints ?? "",
          linkedinUrl: profile.links.find((l) => l.label === "LinkedIn")?.url ?? "",
          githubUrl: profile.links.find((l) => l.label === "GitHub")?.url ?? "",
          websiteUrl: profile.links.find((l) => l.label === "Website")?.url ?? "",
          expectedUpdatedAt: profile.updatedAt.toISOString(),
        }}
      />
    </Column>
  );
}
