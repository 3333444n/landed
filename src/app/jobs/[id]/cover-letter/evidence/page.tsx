import { EvidenceColumn } from "../../documents/EvidenceColumn";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EvidenceColumn jobId={id} type="cover_letter" />;
}
