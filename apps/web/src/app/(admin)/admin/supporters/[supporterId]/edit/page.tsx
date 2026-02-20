import SupportersAdminPageClient from "../../supporters-admin-page-client";
import { fetchAdminSupportersFromServer } from "../../../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../../../lib/admin-generation-server";

type SupporterEditPageProps = {
  params: Promise<{ supporterId: string }>;
};

export default async function SupporterEditPage({ params }: SupporterEditPageProps) {
  const { supporterId } = await params;
  const cookieHeader = await readServerCookieHeader();
  const supporters = await fetchAdminSupportersFromServer(cookieHeader);

  return (
    <SupportersAdminPageClient
      basePath="/admin/supporters"
      routeId={supporterId}
      routeMode="edit"
      initialData={{ supporters }}
    />
  );
}
