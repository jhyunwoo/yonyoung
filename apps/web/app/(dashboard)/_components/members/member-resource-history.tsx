"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/app/(dashboard)/_components/ui/alert";
import { Card } from "@/app/(dashboard)/_components/ui/card";
import { Pagination } from "@/app/(dashboard)/_components/ui/pagination";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { buildDashboardGenerationPath } from "@/features/dashboard/generation/dashboard-generation-route";
import type {
  ApiUserResourceHistory,
  ApiUserResourceHistoryItem,
} from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 멤버가 만든 활동/전시 변경 이력 섹션.
 *
 * member-detail-client.tsx(595줄)에서 분리했다. 설정 화면과 기수 화면의 멤버
 * 상세가 같은 이력 UI 를 쓰므로 공용 컴포넌트로 둔다.
 */

const HISTORY_PAGE_SIZE = 10;

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "멤버 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

const readHistoryResourceLabel = (
  resourceType: ApiUserResourceHistoryItem["resourceType"],
): string => {
  switch (resourceType) {
    case "activity":
      return "활동";
    case "exhibition":
      return "전시";
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
    case "linktree":
      return `/dashboard/settings/linktree/${item.resourceId}`;
    case "linktree_item":
      return item.linktreeId
        ? `/dashboard/settings/linktree/${item.linktreeId}/items/${item.resourceId}`
        : null;
    case "activity":
    case "exhibition": {
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
      return `${generationPath}/exhibitions/${item.resourceId}`;
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
      <p className="mt-3 rounded-lg border border-dashed border-hairline-strong bg-surface-sunken px-4 py-3 text-sm text-ink-muted">
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
            className="rounded-lg border border-hairline bg-surface-sunken px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-hairline-strong bg-surface px-2 py-0.5 text-xs font-semibold text-ink-secondary">
                {resourceLabel}
              </span>
              <span className="text-xs font-semibold text-ink-secondary">
                {actionLabel}
              </span>
              <span className="text-xs text-ink-muted">
                {formatKoreanDate(item.createdAt)}
              </span>
              {item.isDeleted ? (
                <span className="rounded-full border border-danger-hairline bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger-text">
                  삭제됨
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-ink">
              {path ? (
                <Link href={path} className="font-semibold text-ink hover:text-ink">
                  {title}
                </Link>
              ) : (
                <span className="font-semibold text-ink">{title}</span>
              )}
            </p>

            <p className="mt-1 text-xs text-ink-muted">
              변경 필드:{" "}
              {item.changedFields.length > 0 ? item.changedFields.join(", ") : "-"}
            </p>
          </li>
        );
      })}
    </ul>
  );
};

const HistoryListSkeleton = () => (
  <div className="mt-3 space-y-2" aria-hidden="true">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={`settings-member-history-skeleton-${index + 1}`}
        className="rounded-lg border border-hairline bg-surface-sunken px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="mt-3 h-5 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </div>
    ))}
  </div>
);

type PaginatedHistorySectionProps = {
  memberId: string;
  title: string;
  emptyMessage: string;
  generationNamesById: Record<string, string>;
  action?: ApiUserResourceHistoryItem["action"];
  description: string;
  testId: string;
};

export const PaginatedHistorySection = ({
  memberId,
  title,
  emptyMessage,
  generationNamesById,
  action,
  description,
  testId,
}: PaginatedHistorySectionProps) => {
  const [history, setHistory] = useState<ApiUserResourceHistory | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await adminResourceApi.getUserResourceHistory(memberId, {
          page,
          pageSize: HISTORY_PAGE_SIZE,
          ...(action ? { action } : {}),
        });

        if (!isMounted) {
          return;
        }

        setHistory(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

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
  }, [action, memberId, page]);

  const items = history?.items ?? [];
  const total = history?.total ?? 0;
  const totalPages = history?.totalPages ?? 0;
  const startItemNumber = total === 0 ? 0 : (page - 1) * HISTORY_PAGE_SIZE + 1;
  const endItemNumber = total === 0 ? 0 : startItemNumber + Math.max(0, items.length - 1);

  return (
    <Card as="section" padding="sm" data-testid={testId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-xs text-ink-muted">{description}</p>
        </div>
        {history ? (
          <p className="text-xs text-ink-muted">
            총 {total}건
            {items.length > 0 ? ` · ${startItemNumber}-${endItemNumber}건 표시 중` : ""}
          </p>
        ) : null}
      </div>

      {isLoading && !history ? <HistoryListSkeleton /> : null}

      {errorMessage !== null ? (
        <Alert tone="danger" className="mt-3">
          {errorMessage}
        </Alert>
      ) : null}

      {!errorMessage && history ? (
        <>
          <HistoryList
            items={items}
            generationNamesById={generationNamesById}
            emptyMessage={emptyMessage}
          />

          {items.length > 0 && totalPages > 1 ? (
            <div className="mt-4 border-t border-hairline pt-4">
              <Pagination
                page={page}
                pageCount={totalPages}
                onChange={setPage}
                testIdPrefix="settings-member-history"
              />
            </div>
          ) : null}

          {isLoading ? (
            <p className="mt-3 text-xs text-ink-muted">페이지를 불러오는 중입니다.</p>
          ) : null}
        </>
      ) : null}
    </Card>
  );
};
