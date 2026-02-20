import SupportersAdminPageClient from "../supporters-admin-page-client";
import { fetchAdminSupportersFromServer } from "../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../lib/admin-generation-server";

type SupporterDetailPageProps = {
  params: Promise<{ supporterId: string }>;
};

export default async function SupporterDetailPage({ params }: SupporterDetailPageProps) {
  const { supporterId } = await params;
  const cookieHeader = await readServerCookieHeader();
  const supporters = await fetchAdminSupportersFromServer(cookieHeader);

  return (
    <SupportersAdminPageClient
      basePath="/admin/supporters"
      routeId={supporterId}
      routeMode="detail"
      initialData={{ supporters }}
    />
  );
}
