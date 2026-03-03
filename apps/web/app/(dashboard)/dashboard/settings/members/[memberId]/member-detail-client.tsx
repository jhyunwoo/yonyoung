"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  ApiUser,
  ApiUserResourceHistoryItem,
} from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { buildDashboardGenerationPath } from "@/features/dashboard/generation/dashboard-generation-route";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import {
  buildMemberRoleLabel,
  canEditMemberProfile,
} from "@/features/dashboard/members/member-role-label";
import { Skeleton } from "@/components/ui/skeleton";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import MemberEditForm from "@/app/(dashboard)/_components/member-edit-form";

type MemberDetailClientProps = {
  memberId: string;
  viewerRole: string | null;
};

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "멤버 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
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

const readHistoryResourceLabel = (
  resourceType: ApiUserResourceHistoryItem["resourceType"],
): string => {
  switch (resourceType) {
    case "activity":
      return "활동";
    case "exhibition":
      return "전시";
    case "generation_notice":
      return "기수 공지";
    case "global_notice":
      return "전체 공지";
    case "linktree":
      return "링크 모음";
    case "linktree_item":
      return "링크 모음 항목";
    default:
      return resourceType;
  }
};

const readHistoryActionLabel = (action: ApiUserResourceHistoryItem["action"]): string => {
  switch (action) {
    case "create":
      return "생성";
    case "update":
      return "수정";
    case "delete":
      return "삭제";
    default:
      return action;
  }
};

const resolveHistoryPath = (
  item: ApiUserResourceHistoryItem,
  generationNamesById: Record<string, string>,
): string | null => {
  switch (item.resourceType) {
    case "global_notice":
      return `/dashboard/settings/notices/${item.resourceId}`;
    case "linktree":
      return `/dashboard/settings/linktree/${item.resourceId}`;
    case "linktree_item":
      return item.linktreeId
        ? `/dashboard/settings/linktree/${item.linktreeId}/items/${item.resourceId}`
        : null;
    case "activity":
    case "exhibition":
    case "generation_notice": {
      if (!item.generationId) {
        return null;
      }
      const generationName = generationNamesById[item.generationId];
      if (!generationName) {
        return null;
      }

      const generationPath = buildDashboardGenerationPath({ name: generationName });
      if (item.resourceType === "activity") {
        return `${generationPath}/activities/${item.resourceId}`;
      }
      if (item.resourceType === "exhibition") {
        return `${generationPath}/exhibitions/${item.resourceId}`;
      }
      return `${generationPath}/notices/${item.resourceId}`;
    }
    default:
      return null;
  }
};

const HistoryList = (input: {
  items: ApiUserResourceHistoryItem[];
  generationNamesById: Record<string, string>;
  emptyMessage: string;
}) => {
  if (input.items.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        {input.emptyMessage}
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {input.items.map((item) => {
        const path = resolveHistoryPath(item, input.generationNamesById);
        const title = item.resourceTitle ?? "이름 미확인 리소스";
        const resourceLabel = readHistoryResourceLabel(item.resourceType);
        const actionLabel = readHistoryActionLabel(item.action);

        return (
          <li
            key={item.id}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                {resourceLabel}
              </span>
              <span className="text-xs font-semibold text-slate-700">{actionLabel}</span>
              <span className="text-xs text-slate-500">
                {formatKoreanDate(item.createdAt)}
              </span>
              {item.isDeleted ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  삭제됨
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-slate-900">
              {path ? (
                <Link
                  href={path}
                  className="font-semibold text-slate-800 hover:text-slate-950"
                >
                  {title}
                </Link>
              ) : (
                <span className="font-semibold text-slate-800">{title}</span>
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              변경 필드:{" "}
              {item.changedFields.length > 0 ? item.changedFields.join(", ") : "-"}
            </p>
          </li>
        );
      })}
    </ul>
  );
};

export default function MemberDetailClient({
  memberId,
  viewerRole,
}: MemberDetailClientProps) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [historyItems, setHistoryItems] = useState<ApiUserResourceHistoryItem[]>([]);
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
        const [targetUser, history, generations] = await Promise.all([
          adminResourceApi.getUserById(memberId),
          adminResourceApi.getUserResourceHistory(memberId, 100),
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
        setHistoryItems(history.items);
        setGenerationNamesById(nextGenerationNamesById);
        setIsEditing(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setUser(null);
        setHistoryItems([]);
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

  const writtenItems = useMemo(
    () => historyItems.filter((item) => item.action === "create"),
    [historyItems],
  );
  const modifiedItems = historyItems;

  if (isLoading) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
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
      </main>
    );
  }

  if (errorMessage || !user) {
    return (
      <main className="px-4 py-6 md:px-8 md:py-8">
        <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm text-red-700">
            {errorMessage ?? "멤버 정보를 찾을 수 없습니다."}
          </p>
          <Link
            href="/dashboard/settings/members"
            className="mt-4 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            멤버 목록으로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  const displayName = buildMemberDisplayName(user);
  const avatarFallback = buildMemberDisplayInitial(displayName);
  const roleLabel = buildMemberRoleLabel(user.role);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <Link
            href="/dashboard/settings/members"
            className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase hover:text-slate-700"
          >
            Settings / Members
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={`${displayName} 프로필 이미지`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base font-semibold text-slate-500">
                  {avatarFallback}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-slate-600">전체 멤버 상세</p>
            </div>

            {canEdit && !isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
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
            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900">전체 정보</h2>
              <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold text-slate-500">회원 구분</dt>
                  <dd className="mt-1 text-sm text-slate-900">{roleLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">이메일</dt>
                  <dd className="mt-1 text-sm text-slate-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">성</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {user.familyName ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">이름</dt>
                  <dd className="mt-1 text-sm text-slate-900">{user.givenName ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">대학</dt>
                  <dd className="mt-1 text-sm text-slate-900">{user.college ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">학과</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {user.department ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">학번</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {user.studentNumber ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">전화번호</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {user.phoneNumber ?? "-"}
                  </dd>
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <dt className="text-xs font-semibold text-slate-500">소속 기수</dt>
                  <dd className="mt-1 break-all text-sm text-slate-900">
                    {readGenerationNameText(user, generationNamesById)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">생성일</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatKoreanDate(user.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">수정일</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatKoreanDate(user.updatedAt)}
                  </dd>
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <dt className="text-xs font-semibold text-slate-500">최근 수정</dt>
                  <dd className="mt-1">
                    <LastUpdatedMeta
                      updatedAt={user.updatedAt}
                      updatedBy={user.updatedBy}
                      className="text-sm text-slate-900"
                    />
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">작성한 글</h2>
          <HistoryList
            items={writtenItems}
            generationNamesById={generationNamesById}
            emptyMessage="작성한 글 이력이 없습니다."
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">수정한 게시물 목록</h2>
          <HistoryList
            items={modifiedItems}
            generationNamesById={generationNamesById}
            emptyMessage="수정/생성/삭제 이력이 없습니다."
          />
        </section>
      </div>
    </main>
  );
}
