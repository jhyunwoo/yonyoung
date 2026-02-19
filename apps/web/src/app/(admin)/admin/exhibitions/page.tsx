import ExhibitionsAdminPageClient from "./exhibitions-admin-page-client";
import {
  fetchAdminExhibitionsFromServer,
  fetchAdminGenerationsFromServer,
} from "../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../lib/admin-generation-server";

export default async function ExhibitionsPage() {
  const cookieHeader = await readServerCookieHeader();
  const [exhibitions, generations] = await Promise.all([
    fetchAdminExhibitionsFromServer(cookieHeader),
    fetchAdminGenerationsFromServer(cookieHeader),
  ]);

  return (
    <ExhibitionsAdminPageClient
      initialData={{
        exhibitions,
        generations,
      }}
    />
  );
}
