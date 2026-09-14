import { RunsColumn } from "../../documents/RunsColumn";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RunsColumn jobId={id} type="cover_letter" />;
}
