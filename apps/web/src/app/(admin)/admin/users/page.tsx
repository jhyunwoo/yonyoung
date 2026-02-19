import UsersAdminPageClient from "./users-admin-page-client";
import {
  fetchAdminGenerationsFromServer,
  fetchAdminUsersFromServer,
} from "../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../lib/admin-generation-server";
import { serverAuthTool } from "../../../../lib/auth-server-tool";

export default async function GlobalUsersPage() {
  await serverAuthTool.requireGlobalUserManagementAccess();

  const cookieHeader = await readServerCookieHeader();
  const [users, generations] = await Promise.all([
    fetchAdminUsersFromServer(cookieHeader),
    fetchAdminGenerationsFromServer(cookieHeader),
  ]);

  return (
    <UsersAdminPageClient
      initialData={{
        users,
        generations,
      }}
    />
  );
}
