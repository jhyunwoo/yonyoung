import ActivitiesAdminPageClient from "../../activities-admin-page-client";
import {
  fetchAdminActivitiesFromServer,
  fetchAdminGenerationsFromServer,
} from "../../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../../lib/admin-generation-server";

type ActivityEditPageProps = {
  params: Promise<{ activityId: string }>;
};

export default async function ActivityEditPage({ params }: ActivityEditPageProps) {
  const { activityId } = await params;
  const cookieHeader = await readServerCookieHeader();
  const [activities, generations] = await Promise.all([
    fetchAdminActivitiesFromServer(cookieHeader),
    fetchAdminGenerationsFromServer(cookieHeader),
  ]);

  return (
    <ActivitiesAdminPageClient
      basePath="/admin/activities"
      routeId={activityId}
      routeMode="edit"
      initialData={{
        activities,
        generations,
      }}
    />
  );
}
