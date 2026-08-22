import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { readCookieHeader } from "@/shared/http/http";
import {
  listAdminGenerations,
  listAdminUsers,
} from "@/features/dashboard/services/admin-read-service";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import GenerationManagementClient from "@/app/(dashboard)/dashboard/settings/generations/generation-management-client";

export default async function SettingsGenerationsPage() {
  await serverAuthGuard.requirePresidentAccess();

  const cookieHeader = await readCookieHeader();
  const [generationsResult, usersResult] = await Promise.all([
    listAdminGenerations(cookieHeader),
    listAdminUsers(cookieHeader),
  ]);

  if (!generationsResult.ok) {
    return (
      <PageContainer>
        <AdminReadErrorNotice error={generationsResult.error} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <GenerationManagementClient
        initialGenerations={generationsResult.data}
        initialUsers={usersResult.ok ? usersResult.data : []}
      />
    </PageContainer>
  );
}
