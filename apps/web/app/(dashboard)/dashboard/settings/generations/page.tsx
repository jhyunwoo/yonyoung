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
      {/* 사용자 목록을 못 읽었으면 배정 패널이 "사용자 없음"처럼 보인다. 원인을 따로 알린다. */}
      {!usersResult.ok ? <AdminReadErrorNotice error={usersResult.error} /> : null}
      <GenerationManagementClient
        initialGenerations={generationsResult.data}
        initialUsers={usersResult.ok ? usersResult.data : []}
      />
    </PageContainer>
  );
}
