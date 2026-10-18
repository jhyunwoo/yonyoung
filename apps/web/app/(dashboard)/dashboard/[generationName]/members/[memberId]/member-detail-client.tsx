"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  ApiGeneration,
  ApiGenerationMemberSummary,
  ApiUser,
} from "@yonyoung/contracts";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
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

const readGenerationNameText = (
  user: ApiUser,
  generationNamesById: Record<string, string>,
): string => {
  const ids = user.generationIds ?? (user.generationId ? [user.generationId] : []);
  if (ids.length === 0) {
    return "없음";
  }

  const uniqueIds = Array.from(new Set(ids));
  const names = uniqueIds.map((id) => generationNamesById[id] ?? "알 수 없는 기수");
  return names.join(", ");
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
  const profileImage = currentUserLike.image;
  const avatarFallback = buildMemberDisplayInitial(displayName);
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

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-hairline bg-canvas-soft">
              {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImage}
                  alt={`${displayName} 프로필 이미지`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base font-semibold text-ink-muted">
                  {avatarFallback}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-ink md:text-3xl">{displayName}</h1>
              <p className="mt-1 text-sm text-ink-muted">{generation.name} 멤버 상세</p>
            </div>

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
          </div>

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
                <div className="mt-6 rounded-lg border border-hairline p-4">
                  <h2 className="text-sm font-semibold text-ink">전체 정보</h2>
                  <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold text-ink-muted">이메일</dt>
                      <dd className="mt-1 text-sm text-ink wrap-anywhere">
                        {fullUser.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-ink-muted">성</dt>
                      <dd className="mt-1 text-sm text-ink">
                        {fullUser.familyName ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-ink-muted">이름</dt>
                      <dd className="mt-1 text-sm text-ink">
                        {fullUser.givenName ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-ink-muted">대학</dt>
                      <dd className="mt-1 text-sm text-ink">{fullUser.college ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-ink-muted">학번</dt>
                      <dd className="mt-1 text-sm text-ink">
                        {fullUser.studentNumber ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-ink-muted">전화번호</dt>
                      <dd className="mt-1 text-sm text-ink">
                        {fullUser.phoneNumber ?? "-"}
                      </dd>
                    </div>
                    <div className="md:col-span-2 xl:col-span-3">
                      <dt className="text-xs font-semibold text-ink-muted">소속 기수</dt>
                      <dd className="mt-1 break-all text-sm text-ink">
                        {readGenerationNameText(fullUser, generationNamesById)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-ink-muted">생성일</dt>
                      <dd className="mt-1 text-sm text-ink">
                        {formatKoreanDate(fullUser.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-ink-muted">수정일</dt>
                      <dd className="mt-1 text-sm text-ink">
                        {formatKoreanDate(fullUser.updatedAt)}
                      </dd>
                    </div>
                    <div className="md:col-span-2 xl:col-span-3">
                      <dt className="text-xs font-semibold text-ink-muted">최근 수정</dt>
                      <dd className="mt-1">
                        <LastUpdatedMeta
                          updatedAt={fullUser.updatedAt}
                          updatedBy={fullUser.updatedBy}
                          className="text-sm text-ink"
                        />
                      </dd>
                    </div>
                  </dl>
                </div>
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
