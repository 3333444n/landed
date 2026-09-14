import type { ReactNode } from "react";
import { DocumentColumn } from "../documents/DocumentColumn";

export const dynamic = "force-dynamic";

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  const { id } = await params;
  return (
    <>
      <DocumentColumn jobId={id} type="resume" />
      {children}
    </>
  );
}
