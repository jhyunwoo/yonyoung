import ActivitiesAdminPageClient from "../../../../activities/activities-admin-page-client";
import {
  fetchAdminActivitiesFromServer,
  fetchAdminGenerationsFromServer,
} from "../../../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../../../lib/admin-generation-server";

type GenerationActivityEditPageProps = {
  params: Promise<{ generation: string; activityId: string }>;
};

export default async function GenerationActivityEditPage({
  params,
}: GenerationActivityEditPageProps) {
  const { generation, activityId } = await params;
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
      routeId={activityId}
      routeMode="edit"
      initialData={{
        activities,
        generations,
      }}
    />
  );
}
