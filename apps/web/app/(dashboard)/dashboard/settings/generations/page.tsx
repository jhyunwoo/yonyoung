import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import GenerationManagementClient from "@/app/(dashboard)/dashboard/settings/generations/generation-management-client";

export default async function SettingsGenerationsPage() {
  await serverAuthGuard.requirePresidentAccess();

  return (
    <PageContainer>
      <GenerationManagementClient />
    </PageContainer>
  );
}
