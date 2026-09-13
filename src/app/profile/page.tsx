import { requireProfile } from "@/app/current-profile";
import { Card } from "@/components/Card";
import { Page, Section } from "@/components/Page";
import { updateProfileAction } from "./actions";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireProfile();
  const preferences = profile.preferences;

  return (
    <Page title="Profile" subtitle="How you appear on a resume.">
      <Section>
        <Card>
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
              expectedUpdatedAt: profile.updatedAt.toISOString(),
            }}
          />
        </Card>
      </Section>
    </Page>
  );
}
