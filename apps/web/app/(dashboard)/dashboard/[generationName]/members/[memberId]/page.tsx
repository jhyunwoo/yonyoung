import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { resolveProfileUserId } from "@/features/auth/profile/read-editable-profile-data";
import {
  getAdminUserById,
  listAdminGenerationMembers,
  listAdminGenerations,
} from "@/features/dashboard/services/admin-read-service";
import { decodeMemberId } from "@/features/dashboard/members/decode-member-id";
import { buildMemberGenerationNamesById } from "@/features/dashboard/members/member-directory";
import {
  canEditMemberProfile,
  isExecutiveRole,
} from "@/features/dashboard/members/member-role-label";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import MemberDetailClient from "@/app/(dashboard)/dashboard/[generationName]/members/[memberId]/member-detail-client";

const MemberDetailUnavailable = ({
  membersPath,
  children,
}: {
  membersPath: string;
  children: ReactNode;
}) => (
  <div className="px-4 py-6 md:px-8 md:py-8">
    <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      {children}
      <Link
        href={membersPath}
        className="mt-4 inline-flex text-sm font-semibold text-ink-secondary hover:text-ink"
      >
        멤버 목록으로 돌아가기
      </Link>
    </section>
  </div>
);

export default async function GenerationMemberDetailPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string; memberId: string }>;
}>) {
  const [{ memberId: rawMemberId }, generation, session] = await Promise.all([
    params,
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
  ]);
  const profile = await serverAuthGuard.getCurrentUserProfile(session);
  const viewerId = resolveProfileUserId(profile, session.user.id);

  const memberId = decodeMemberId(rawMemberId);
  if (!memberId) {
    notFound();
  }

  const viewerRole = session.user.role ?? null;
  const isSelf = viewerId === memberId;
  const canReadFullDetail = isExecutiveRole(viewerRole) || isSelf;
  const membersPath = `${generation.path}/members`;

  const [membersResult, userResult, generationsResult] = await Promise.all([
    listAdminGenerationMembers(generation.id),
    canReadFullDetail ? getAdminUserById(memberId) : null,
    listAdminGenerations(),
  ]);

  if (!membersResult.ok) {
    return (
      <MemberDetailUnavailable membersPath={membersPath}>
        <AdminReadErrorNotice
          error={membersResult.error}
          className="text-sm text-danger-text"
        />
      </MemberDetailUnavailable>
    );
  }

  const summary = membersResult.data.find((member) => member.id === memberId);
  if (!summary) {
    return (
      <MemberDetailUnavailable membersPath={membersPath}>
        <p className="text-sm text-danger-text">해당 기수에서 멤버를 찾을 수 없습니다.</p>
      </MemberDetailUnavailable>
    );
  }

  // 상세 권한이 없으면(403) 제한 정보만 보여 준다. 그 밖의 실패는 오류다.
  if (userResult && !userResult.ok && userResult.error.reason !== "forbidden") {
    return (
      <MemberDetailUnavailable membersPath={membersPath}>
        <AdminReadErrorNotice
          error={userResult.error}
          className="text-sm text-danger-text"
        />
      </MemberDetailUnavailable>
    );
  }
  const fullUser = userResult?.ok ? userResult.data : null;

  // 기수명 조회에 실패하면 현재 기수 이름만으로 표시한다.
  const generationNamesById: Record<string, string> = {
    [generation.id]: generation.name,
    ...(generationsResult.ok
      ? buildMemberGenerationNamesById(generationsResult.data)
      : {}),
  };

  return (
    <MemberDetailClient
      generation={generation}
      initialSummary={summary}
      initialFullUser={fullUser}
      generationNamesById={generationNamesById}
      generations={generationsResult.ok ? generationsResult.data : []}
      isSelf={isSelf}
      canEdit={canEditMemberProfile(viewerRole)}
    />
  );
}
