import { redirect } from "next/navigation";
import { getAccessibleGenerations, buildGenerationPath } from "../../../lib/admin-generation";
import {
  fetchGenerationsFromServer,
  readServerCookieHeader,
} from "../../../lib/admin-generation-server";
import { serverAuthTool } from "../../../lib/auth-server-tool";

export default async function AdminPage() {
  const session = await serverAuthTool.requireAdminPageAccess();
  const cookieHeader = await readServerCookieHeader();
  const generations = await fetchGenerationsFromServer(cookieHeader);
  const accessible = getAccessibleGenerations(session, generations);

  if (accessible.length === 0) {
    redirect("/admin/unassigned");
  }

  const defaultGeneration = accessible[0];
  if (!defaultGeneration) {
    redirect("/admin/unassigned");
  }

  redirect(buildGenerationPath(defaultGeneration.sortOrder));
}
