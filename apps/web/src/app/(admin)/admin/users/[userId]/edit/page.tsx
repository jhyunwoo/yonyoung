import UsersAdminPageClient from "../../users-admin-page-client";
import {
  fetchAdminGenerationsFromServer,
  fetchAdminUsersFromServer,
} from "../../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../../lib/admin-generation-server";
import { serverAuthTool } from "../../../../../../lib/auth-server-tool";

type UserEditPageProps = {
  params: Promise<{ userId: string }>;
};

export default async function UserEditPage({ params }: UserEditPageProps) {
  await serverAuthTool.requireGlobalUserManagementAccess();

  const { userId } = await params;
  const cookieHeader = await readServerCookieHeader();
  const [users, generations] = await Promise.all([
    fetchAdminUsersFromServer(cookieHeader),
    fetchAdminGenerationsFromServer(cookieHeader),
  ]);

  return (
    <UsersAdminPageClient
      basePath="/admin/users"
      routeId={userId}
      routeMode="edit"
      initialData={{
        users,
        generations,
      }}
    />
  );
}
