import ExhibitionsAdminPageClient from "../exhibitions-admin-page-client";
import {
  fetchAdminExhibitionsFromServer,
  fetchAdminGenerationsFromServer,
} from "../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../lib/admin-generation-server";

type ExhibitionDetailPageProps = {
  params: Promise<{ exhibitionId: string }>;
};

export default async function ExhibitionDetailPage({ params }: ExhibitionDetailPageProps) {
  const { exhibitionId } = await params;
  const cookieHeader = await readServerCookieHeader();
  const [exhibitions, generations] = await Promise.all([
    fetchAdminExhibitionsFromServer(cookieHeader),
    fetchAdminGenerationsFromServer(cookieHeader),
  ]);

  return (
    <ExhibitionsAdminPageClient
      basePath="/admin/exhibitions"
      routeId={exhibitionId}
      routeMode="detail"
      initialData={{
        exhibitions,
        generations,
      }}
    />
  );
}
