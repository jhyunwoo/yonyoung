"use client";

import { useState } from "react";
import Link from "next/link";
import type { ApiGeneration, ApiUser } from "@yonyoung/contracts";
import { buildMemberDisplayName } from "@/features/dashboard/members/display-name";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import MemberFullInfoList, {
  MemberInfoItem,
} from "@/app/(dashboard)/_components/members/member-full-info-list";
import MemberProfileHeader from "@/app/(dashboard)/_components/members/member-profile-header";
import MemberEditForm from "@/app/(dashboard)/_components/member-edit-form";
import { PaginatedHistorySection } from "@/app/(dashboard)/_components/members/member-resource-history";

type MemberDetailClientProps = {
  memberId: string;
  initialUser: ApiUser;
  generations: ApiGeneration[];
  generationNamesById: Record<string, string>;
  canEdit: boolean;
};

export default function MemberDetailClient({
  memberId,
  initialUser,
  generations,
  generationNamesById,
  canEdit,
}: MemberDetailClientProps) {
  const [user, setUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);

  const displayName = buildMemberDisplayName(user);
  const roleLabel = buildMemberRoleLabel(user.role);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="rounded-lg border border-hairline bg-surface p-6 md:p-8">
          <Link
            href="/dashboard/settings/members"
            className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase hover:text-ink-secondary"
          >
            Settings / Members
          </Link>

          <MemberProfileHeader
            displayName={displayName}
            image={user.image}
            subtitle="전체 멤버 상세"
          >
            {canEdit && !isEditing ? (
              <button
                type="button"
                data-testid="settings-member-detail-edit-toggle"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center rounded-lg border border-hairline-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-canvas-soft"
              >
                수정
              </button>
            ) : null}
          </MemberProfileHeader>

          {isEditing && canEdit ? (
            <MemberEditForm
              user={user}
              generations={generations}
              inline
              onCancel={() => setIsEditing(false)}
              onSaved={(updated) => {
                setUser(updated);
                setIsEditing(false);
              }}
            />
          ) : (
            <MemberFullInfoList
              user={user}
              generationNamesById={generationNamesById}
              leading={<MemberInfoItem label="회원 구분">{roleLabel}</MemberInfoItem>}
              showsDepartment
            />
          )}
        </section>

        <PaginatedHistorySection
          key={`written-history-${memberId}`}
          memberId={memberId}
          title="작성한 글"
          description="작성 이력을 최신순으로 10개씩 확인할 수 있습니다."
          generationNamesById={generationNamesById}
          action="create"
          emptyMessage="작성한 글 이력이 없습니다."
          testId="settings-member-detail-written-history"
        />

        <PaginatedHistorySection
          key={`modified-history-${memberId}`}
          memberId={memberId}
          title="수정한 게시물 목록"
          description="수정/생성/삭제 이력을 최신순으로 10개씩 넘겨 볼 수 있습니다."
          generationNamesById={generationNamesById}
          emptyMessage="수정/생성/삭제 이력이 없습니다."
          testId="settings-member-detail-modified-history"
        />
      </div>
    </div>
  );
}
