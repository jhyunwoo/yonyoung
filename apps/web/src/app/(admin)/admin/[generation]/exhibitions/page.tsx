import ExhibitionsAdminPageClient from "../../exhibitions/exhibitions-admin-page-client";
import {
  fetchAdminExhibitionsFromServer,
  fetchAdminGenerationsFromServer,
} from "../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../lib/admin-generation-server";

type GenerationExhibitionsPageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationExhibitionsPage({
  params,
}: GenerationExhibitionsPageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  const cookieHeader = await readServerCookieHeader();
  const [exhibitions, generations] = await Promise.all([
    fetchAdminExhibitionsFromServer(cookieHeader),
    fetchAdminGenerationsFromServer(cookieHeader),
  ]);

  return (
    <ExhibitionsAdminPageClient
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
      generationScoped
      initialData={{
        exhibitions,
        generations,
      }}
    />
  );
}
