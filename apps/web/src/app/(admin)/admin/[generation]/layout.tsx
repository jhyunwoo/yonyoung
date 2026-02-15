import { ReactNode } from "react";
import { forbidden, notFound } from "next/navigation";
import { getAccessibleGenerations, resolveGenerationBySortOrder } from "../../../../lib/admin-generation";
import {
  fetchGenerationsFromServer,
  readServerCookieHeader,
} from "../../../../lib/admin-generation-server";
import { serverAuthTool } from "../../../../lib/auth-server-tool";

type GenerationLayoutProps = {
  children: ReactNode;
  params: Promise<{ generation: string }>;
};

export default async function GenerationScopedLayout({
  children,
  params,
}: GenerationLayoutProps) {
  const { generation } = await params;
  const session = await serverAuthTool.requireAdminPageAccess();
  const cookieHeader = await readServerCookieHeader();
  const generations = await fetchGenerationsFromServer(cookieHeader);
  const accessible = getAccessibleGenerations(session, generations);

  if (accessible.length === 0) {
    forbidden();
  }

  const defaultGeneration = accessible[0];
  if (!defaultGeneration) {
    forbidden();
  }

  const selected = resolveGenerationBySortOrder(generations, generation);
  if (!selected) {
    notFound();
  }

  const isAllowed = accessible.some(
    (candidate) => candidate.id === selected.id,
  );
  if (!isAllowed) {
    forbidden();
  }

  return children;
}
