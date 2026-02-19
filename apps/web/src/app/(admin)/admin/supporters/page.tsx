import SupportersAdminPageClient from "./supporters-admin-page-client";
import { fetchAdminSupportersFromServer } from "../../../../lib/admin-resource-server";
import { readServerCookieHeader } from "../../../../lib/admin-generation-server";

export default async function SupportersPage() {
  const cookieHeader = await readServerCookieHeader();
  const supporters = await fetchAdminSupportersFromServer(cookieHeader);

  return <SupportersAdminPageClient initialData={{ supporters }} />;
}
