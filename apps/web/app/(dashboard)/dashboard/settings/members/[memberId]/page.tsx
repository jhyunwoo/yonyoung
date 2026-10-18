import Link from "next/link";
import { notFound } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import {
  getAdminUserById,
  listAdminGenerations,
  type AdminReadError,
} from "@/features/dashboard/services/admin-read-service";
import { buildMemberGenerationNamesById } from "@/features/dashboard/members/member-directory";
import { canEditMemberProfile } from "@/features/dashboard/members/member-role-label";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import MemberDetailClient from "@/app/(dashboard)/dashboard/settings/members/[memberId]/member-detail-client";

const decodeMemberId = (rawMemberId: string): string | null => {
  const trimmedMemberId = rawMemberId.trim();
  if (trimmedMemberId.length === 0) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(trimmedMemberId).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
};

const MemberDetailUnavailable = ({ error }: { error: AdminReadError }) => (
  <div className="px-4 py-6 md:px-8 md:py-8">
    <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <AdminReadErrorNotice error={error} className="text-sm text-danger-text" />
      <Link
        href="/dashboard/settings/members"
        className="mt-4 inline-flex text-sm font-semibold text-ink-secondary hover:text-ink"
      >
        멤버 목록으로 돌아가기
      </Link>
    </section>
  </div>
);

export default async function SettingsMemberDetailPage({
  params,
}: Readonly<{
  params: Promise<{ memberId: string }>;
}>) {
  const [{ memberId: rawMemberId }, session] = await Promise.all([
    params,
    serverAuthGuard.requireGlobalUserManagementAccess(),
  ]);

  const memberId = decodeMemberId(rawMemberId);
  if (!memberId) {
    notFound();
  }

  const [userResult, generationsResult] = await Promise.all([
    getAdminUserById(memberId),
    listAdminGenerations(),
  ]);

  if (!userResult.ok) {
    return <MemberDetailUnavailable error={userResult.error} />;
  }
  if (!generationsResult.ok) {
    return <MemberDetailUnavailable error={generationsResult.error} />;
  }

  return (
    <MemberDetailClient
      memberId={memberId}
      initialUser={userResult.data}
      generations={generationsResult.data}
      generationNamesById={buildMemberGenerationNamesById(generationsResult.data)}
      canEdit={canEditMemberProfile(session.user.role ?? null)}
    />
  );
}
