import ExhibitionsAdminPageClient from "../../../exhibitions/exhibitions-admin-page-client";
import {
  fetchAdminExhibitionsFromServer,
  fetchAdminGenerationsFromServer,
} from "../../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../../lib/admin-generation-server";

type GenerationExhibitionDetailPageProps = {
  params: Promise<{ generation: string; exhibitionId: string }>;
};

export default async function GenerationExhibitionDetailPage({
  params,
}: GenerationExhibitionDetailPageProps) {
  const { generation, exhibitionId } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);
  const cookieHeader = await readServerCookieHeader();
  const [exhibitions, generations] = await Promise.all([
    fetchAdminExhibitionsFromServer(cookieHeader),
    fetchAdminGenerationsFromServer(cookieHeader),
  ]);

  return (
    <ExhibitionsAdminPageClient
      basePath={`/admin/${generation}/exhibitions`}
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
      generationScoped
      routeId={exhibitionId}
      routeMode="detail"
      initialData={{
        exhibitions,
        generations,
      }}
    />
  );
}
