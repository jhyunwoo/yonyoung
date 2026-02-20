import UsersAdminPageClient from "../../users/users-admin-page-client";
import {
  fetchAdminGenerationsFromServer,
  fetchAdminUsersFromServer,
} from "../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../lib/admin-generation-server";

type GenerationUsersPageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationUsersPage({
  params,
}: GenerationUsersPageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  const cookieHeader = await readServerCookieHeader();
  const [users, generations] = await Promise.all([
    fetchAdminUsersFromServer(cookieHeader),
    fetchAdminGenerationsFromServer(cookieHeader),
  ]);

  return (
    <UsersAdminPageClient
      basePath={`/admin/${generation}/users`}
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
      generationScoped
      routeId={null}
      routeMode="list"
      initialData={{
        users,
        generations,
      }}
    />
  );
}
