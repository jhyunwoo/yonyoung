import ActivitiesAdminPageClient from "../activities-admin-page-client";
import {
  fetchAdminActivitiesFromServer,
  fetchAdminGenerationsFromServer,
} from "../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../lib/admin-generation-server";

export default async function ActivitiesCreatePage() {
  const cookieHeader = await readServerCookieHeader();
  const [activities, generations] = await Promise.all([
    fetchAdminActivitiesFromServer(cookieHeader),
    fetchAdminGenerationsFromServer(cookieHeader),
  ]);

  return (
    <ActivitiesAdminPageClient
      basePath="/admin/activities"
      routeId={null}
      routeMode="create"
      initialData={{
        activities,
        generations,
      }}
    />
  );
}
