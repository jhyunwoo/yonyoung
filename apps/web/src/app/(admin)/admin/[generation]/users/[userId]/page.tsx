import UsersAdminPageClient from "../../../users/users-admin-page-client";
import {
  fetchAdminGenerationsFromServer,
  fetchAdminUsersFromServer,
} from "../../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../../lib/admin-generation-server";

type GenerationUserDetailPageProps = {
  params: Promise<{ generation: string; userId: string }>;
};

export default async function GenerationUserDetailPage({
  params,
}: GenerationUserDetailPageProps) {
  const { generation, userId } = await params;
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
      routeId={userId}
      routeMode="detail"
      initialData={{
        users,
        generations,
      }}
    />
  );
}
