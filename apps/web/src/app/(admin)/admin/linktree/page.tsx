import LinktreeAdminPageClient from "./linktree-admin-page-client";
import { fetchAdminLinktreesFromServer } from "../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../lib/admin-generation-server";

export default async function LinktreePage() {
  const cookieHeader = await readServerCookieHeader();
  const linktrees = await fetchAdminLinktreesFromServer(cookieHeader);

  return <LinktreeAdminPageClient initialData={{ linktrees }} />;
}
