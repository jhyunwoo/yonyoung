import SupportersAdminPageClient from "../../supporters/supporters-admin-page-client";
import { fetchAdminSupportersFromServer } from "../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../lib/admin-generation-server";

type GenerationSupportersPageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationSupportersPage({
  params,
}: GenerationSupportersPageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  const cookieHeader = await readServerCookieHeader();
  const supporters = await fetchAdminSupportersFromServer(cookieHeader);

  return (
    <SupportersAdminPageClient
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
      initialData={{ supporters }}
    />
  );
}
