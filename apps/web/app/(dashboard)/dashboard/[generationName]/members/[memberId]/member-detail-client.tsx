"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  ApiGeneration,
  ApiGenerationMemberSummary,
  ApiUser,
} from "@yonyoung/contracts";
import { buildMemberDisplayName } from "@/features/dashboard/members/display-name";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import MemberFullInfoList from "@/app/(dashboard)/_components/members/member-full-info-list";
import MemberProfileHeader from "@/app/(dashboard)/_components/members/member-profile-header";
import MemberEditForm from "@/app/(dashboard)/_components/member-edit-form";

type MemberDetailClientProps = {
  generation: {
    id: string;
    name: string;
    path: string;
  };
  initialSummary: ApiGenerationMemberSummary;
  /** 상세 열람 권한이 없으면 null이고, 제한 정보만 보여 준다. */
  initialFullUser: ApiUser | null;
  generationNamesById: Record<string, string>;
  generations: ApiGeneration[];
  isSelf: boolean;
  canEdit: boolean;
};

export default function MemberDetailClient({
  generation,
  initialSummary,
  initialFullUser,
  generationNamesById,
  generations,
  isSelf,
  canEdit,
}: MemberDetailClientProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [fullUser, setFullUser] = useState(initialFullUser);
  const [isEditing, setIsEditing] = useState(false);

  const currentUserLike = fullUser ?? summary;

  const displayName = buildMemberDisplayName(currentUserLike);
  const roleLabel = buildMemberRoleLabel(currentUserLike.role);
  const showsFullDetails = Boolean(fullUser);
  const canInlineEdit = canEdit && Boolean(fullUser);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="rounded-lg border border-hairline bg-surface p-6 md:p-8">
          <Link
            href={`${generation.path}/members`}
            className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase hover:text-ink-secondary"
          >
            Members
          </Link>

          <MemberProfileHeader
            displayName={displayName}
            image={currentUserLike.image}
            subtitle={`${generation.name} 멤버 상세`}
          >
            {isSelf ? (
              <span className="rounded-full border border-hairline-strong bg-canvas-soft px-3 py-1 text-xs font-semibold text-ink-secondary">
                내 정보
              </span>
            ) : null}

            {canInlineEdit && !isEditing ? (
              <button
                type="button"
                data-testid="generation-member-detail-edit-toggle"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center rounded-lg border border-hairline-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-canvas-soft"
              >
                수정
              </button>
            ) : null}
          </MemberProfileHeader>

          {isEditing && canInlineEdit && fullUser ? (
            <MemberEditForm
              user={fullUser}
              generations={generations}
              inline
              onCancel={() => setIsEditing(false)}
              onSaved={(updated) => {
                setFullUser(updated);
                setSummary((previous) => ({
                  ...previous,
                  name: updated.name,
                  image: updated.image,
                  familyName: updated.familyName,
                  givenName: updated.givenName,
                  department: updated.department,
                  role: updated.role,
                }));
                setIsEditing(false);
              }}
            />
          ) : (
            <>
              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-lg border border-hairline bg-surface-sunken p-4">
                  <p className="text-xs font-semibold text-ink-muted">회원 구분</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{roleLabel}</p>
                </div>
                <div className="rounded-lg border border-hairline bg-surface-sunken p-4">
                  <p className="text-xs font-semibold text-ink-muted">학과</p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {currentUserLike.department?.trim() || "학과 미등록"}
                  </p>
                </div>
                <div className="rounded-lg border border-hairline bg-surface-sunken p-4">
                  <p className="text-xs font-semibold text-ink-muted">표시 이름</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{displayName}</p>
                </div>
              </div>

              {showsFullDetails && fullUser ? (
                <MemberFullInfoList
                  user={fullUser}
                  generationNamesById={generationNamesById}
                />
              ) : (
                <p className="mt-6 rounded-lg border border-warning-hairline bg-warning-soft p-4 text-sm text-warning-text">
                  제한 정보만 열람할 수 있습니다.
                </p>
              )}
            </>
          )}
        </section>

        {fullUser ? (
          <AuditHistoryPanel resourceType="user" resourceId={fullUser.id} />
        ) : null}
      </div>
    </div>
  );
}
