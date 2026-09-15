import { PasteColumn } from "../../documents/PasteColumn";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PasteColumn jobId={id} type="cover_letter" />;
}
