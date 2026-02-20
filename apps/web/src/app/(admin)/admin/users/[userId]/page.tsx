import UsersAdminPageClient from "../users-admin-page-client";
import {
  fetchAdminGenerationsFromServer,
  fetchAdminUsersFromServer,
} from "../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../lib/admin-generation-server";
import { serverAuthTool } from "../../../../../lib/auth-server-tool";

type UserDetailPageProps = {
  params: Promise<{ userId: string }>;
};

export default async function UserDetailPage({ params }: UserDetailPageProps) {
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
      routeMode="detail"
      initialData={{
        users,
        generations,
      }}
    />
  );
}
