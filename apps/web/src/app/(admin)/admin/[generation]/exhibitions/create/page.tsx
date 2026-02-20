import ExhibitionsAdminPageClient from "../../../exhibitions/exhibitions-admin-page-client";
import {
  fetchAdminExhibitionsFromServer,
  fetchAdminGenerationsFromServer,
} from "../../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../../lib/admin-generation-server";

type GenerationExhibitionsCreatePageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationExhibitionsCreatePage({
  params,
}: GenerationExhibitionsCreatePageProps) {
  const { generation } = await params;
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
      routeId={null}
      routeMode="create"
      initialData={{
        exhibitions,
        generations,
      }}
    />
  );
}
