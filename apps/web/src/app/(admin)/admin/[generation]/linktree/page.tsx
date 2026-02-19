import LinktreeAdminPageClient from "../../linktree/linktree-admin-page-client";
import { fetchAdminLinktreesFromServer } from "../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../lib/admin-generation-server";

type GenerationLinktreePageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationLinktreePage({
  params,
}: GenerationLinktreePageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  const cookieHeader = await readServerCookieHeader();
  const linktrees = await fetchAdminLinktreesFromServer(cookieHeader);

  return (
    <LinktreeAdminPageClient
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
      initialData={{ linktrees }}
    />
  );
}
