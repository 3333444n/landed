import { requireProfile } from "@/app/current-profile";
import { Column, EmptyState } from "@/components/Column";

export const dynamic = "force-dynamic";

/** Phase 1 fills this column with pasted postings and their applications (docs/01, docs/05). */
export default async function JobsPage() {
  await requireProfile();
  return (
    <Column
      title="Jobs"
      count={0}
      subtitle="Postings you are pursuing, and later the ones found for you."
    >
      <EmptyState>No jobs yet. Phase 1 adds pasting a job description.</EmptyState>
    </Column>
  );
}
