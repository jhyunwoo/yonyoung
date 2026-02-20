import ActivitiesAdminPageClient from "../../activities/activities-admin-page-client";
import {
  fetchAdminActivitiesFromServer,
  fetchAdminGenerationsFromServer,
} from "../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../lib/admin-generation-server";

type GenerationActivitiesPageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationActivitiesPage({
  params,
}: GenerationActivitiesPageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  const cookieHeader = await readServerCookieHeader();
  const [activities, generations] = await Promise.all([
    fetchAdminActivitiesFromServer(cookieHeader),
    fetchAdminGenerationsFromServer(cookieHeader),
  ]);

  return (
    <ActivitiesAdminPageClient
      basePath={`/admin/${generation}/activities`}
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
      generationScoped
      routeId={null}
      routeMode="list"
      initialData={{
        activities,
        generations,
      }}
    />
  );
}
