import LinktreeAdminPageClient from "../linktree-admin-page-client";
import { fetchAdminLinktreesFromServer } from "../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../lib/admin-generation-server";

export default async function LinktreeCreatePage() {
  const cookieHeader = await readServerCookieHeader();
  const linktrees = await fetchAdminLinktreesFromServer(cookieHeader);

  return (
    <LinktreeAdminPageClient
      basePath="/admin/linktree"
      routeId={null}
      routeMode="create"
      initialData={{ linktrees }}
    />
  );
}
