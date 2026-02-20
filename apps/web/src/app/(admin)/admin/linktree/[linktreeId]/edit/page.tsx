import LinktreeAdminPageClient from "../../linktree-admin-page-client";
import { fetchAdminLinktreesFromServer } from "../../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../../lib/admin-generation-server";

type LinktreeEditPageProps = {
  params: Promise<{ linktreeId: string }>;
};

export default async function LinktreeEditPage({ params }: LinktreeEditPageProps) {
  const { linktreeId } = await params;
  const cookieHeader = await readServerCookieHeader();
  const linktrees = await fetchAdminLinktreesFromServer(cookieHeader);

  return (
    <LinktreeAdminPageClient
      basePath="/admin/linktree"
      routeId={linktreeId}
      routeMode="edit"
      initialData={{ linktrees }}
    />
  );
}
