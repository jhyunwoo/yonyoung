"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApiUser } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import { readMemberGenerationNameText } from "@/features/dashboard/members/member-directory";
import {
  buildMemberRoleLabel,
  canEditMemberProfile,
} from "@/features/dashboard/members/member-role-label";
import { Skeleton } from "@/components/ui/skeleton";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import MemberEditForm from "@/app/(dashboard)/_components/member-edit-form";
import { PaginatedHistorySection } from "@/app/(dashboard)/_components/members/member-resource-history";

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "멤버 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

type MemberDetailClientProps = {
  memberId: string;
  viewerRole: string | null;
};

export default function MemberDetailClient({
  memberId,
  viewerRole,
}: MemberDetailClientProps) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [generationNamesById, setGenerationNamesById] = useState<Record<string, string>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const canEdit = canEditMemberProfile(viewerRole);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [targetUser, generations] = await Promise.all([
          adminResourceApi.getUserById(memberId),
          adminResourceApi.listGenerations(),
        ]);

        if (!isMounted) {
          return;
        }

        const nextGenerationNamesById = generations.reduce<Record<string, string>>(
          (acc, item) => {
            acc[item.id] = item.name;
            return acc;
          },
          {},
        );

        setUser(targetUser);
        setGenerationNamesById(nextGenerationNamesById);
        setIsEditing(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setUser(null);
        setErrorMessage(readErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [memberId]);

  if (isLoading) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="rounded-lg border border-hairline p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div
                    key={`settings-member-detail-skeleton-${index + 1}`}
                    className="space-y-2"
                  >
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (errorMessage || !user) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
          <p className="text-sm text-danger-text">
            {errorMessage ?? "멤버 정보를 찾을 수 없습니다."}
          </p>
          <Link
            href="/dashboard/settings/members"
            className="mt-4 inline-flex text-sm font-semibold text-ink-secondary hover:text-ink"
          >
            멤버 목록으로 돌아가기
          </Link>
        </section>
      </div>
    );
  }

  const displayName = buildMemberDisplayName(user);
  const avatarFallback = buildMemberDisplayInitial(displayName);
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

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-hairline bg-canvas-soft">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
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
              <p className="mt-1 text-sm text-ink-muted">전체 멤버 상세</p>
            </div>

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
          </div>

          {isEditing && canEdit ? (
            <MemberEditForm
              user={user}
              inline
              onCancel={() => setIsEditing(false)}
              onSaved={(updated) => {
                setUser(updated);
                setIsEditing(false);
              }}
            />
          ) : (
            <div className="mt-6 rounded-lg border border-hairline p-4">
              <h2 className="text-sm font-semibold text-ink">전체 정보</h2>
              <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">회원 구분</dt>
                  <dd className="mt-1 text-sm text-ink">{roleLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">이메일</dt>
                  <dd className="mt-1 text-sm text-ink wrap-anywhere">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">성</dt>
                  <dd className="mt-1 text-sm text-ink">{user.familyName ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">이름</dt>
                  <dd className="mt-1 text-sm text-ink">{user.givenName ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">대학</dt>
                  <dd className="mt-1 text-sm text-ink">{user.college ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">학과</dt>
                  <dd className="mt-1 text-sm text-ink">{user.department ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">학번</dt>
                  <dd className="mt-1 text-sm text-ink">{user.studentNumber ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">전화번호</dt>
                  <dd className="mt-1 text-sm text-ink">{user.phoneNumber ?? "-"}</dd>
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <dt className="text-xs font-semibold text-ink-muted">소속 기수</dt>
                  <dd className="mt-1 break-all text-sm text-ink">
                    {readMemberGenerationNameText(user, generationNamesById)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">생성일</dt>
                  <dd className="mt-1 text-sm text-ink">
                    {formatKoreanDate(user.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-ink-muted">수정일</dt>
                  <dd className="mt-1 text-sm text-ink">
                    {formatKoreanDate(user.updatedAt)}
                  </dd>
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <dt className="text-xs font-semibold text-ink-muted">최근 수정</dt>
                  <dd className="mt-1">
                    <LastUpdatedMeta
                      updatedAt={user.updatedAt}
                      updatedBy={user.updatedBy}
                      className="text-sm text-ink"
                    />
                  </dd>
                </div>
              </dl>
            </div>
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
