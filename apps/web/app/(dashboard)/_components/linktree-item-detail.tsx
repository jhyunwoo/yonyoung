"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiLinktree, ApiLinktreeItem } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { Skeleton } from "@/components/ui/skeleton";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import {
  findLinktreeItemById,
  readLinktreeErrorMessage,
} from "@/app/(dashboard)/_components/linktree-shared";
import { useConfirm } from "@/app/(dashboard)/_components/ui/confirm-provider";

type LinktreeItemDetailProps = {
  linktreeId: string;
  itemId: string;
  canWrite: boolean;
  listPath: string;
};

export default function LinktreeItemDetail({
  linktreeId,
  itemId,
  canWrite,
  listPath,
}: LinktreeItemDetailProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [linktree, setLinktree] = useState<ApiLinktree | null>(null);
  const [item, setItem] = useState<ApiLinktreeItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGroupNotFound, setIsGroupNotFound] = useState(false);
  const [isItemNotFound, setIsItemNotFound] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    setIsLoading(true);
    setIsGroupNotFound(false);
    setIsItemNotFound(false);
    setErrorMessage(null);

    try {
      const row = await adminResourceApi.getLinktreeById(linktreeId);
      const foundItem = findLinktreeItemById(row, itemId);

      setLinktree(row);
      if (!foundItem) {
        setItem(null);
        setIsItemNotFound(true);
      } else {
        setItem(foundItem);
      }
    } catch (error) {
      setItem(null);
      setLinktree(null);
      if (error instanceof AdminApiError && error.status === 404) {
        setIsGroupNotFound(true);
      } else {
        setErrorMessage(readLinktreeErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  }, [itemId, linktreeId]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "이 링크를 삭제하시겠습니까?",
      description: "삭제한 링크는 되돌릴 수 없습니다.",
      confirmLabel: "삭제",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.deleteLinktreeItem(linktreeId, itemId);
      router.replace(`${listPath}/${linktreeId}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(readLinktreeErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <div className="rounded-lg border border-hairline p-4">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="mt-2 h-5 w-36" />
            <Skeleton className="mt-4 h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-4/5" />
            <div className="mt-5 flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isGroupNotFound) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
        <h1 className="text-2xl font-bold text-ink md:text-3xl">링크 상세</h1>
        <p className="mt-3 text-sm text-ink-muted">
          존재하지 않는 분류이거나 접근할 수 없습니다.
        </p>
        <Link
          href={listPath}
          className="mt-6 inline-flex rounded-lg border border-hairline-strong px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft"
        >
          목록으로 이동
        </Link>
      </section>
    );
  }

  if (isItemNotFound) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
        <h1 className="text-2xl font-bold text-ink md:text-3xl">링크 상세</h1>
        <p className="mt-3 text-sm text-ink-muted">
          존재하지 않는 링크이거나 접근할 수 없습니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={listPath}
            className="inline-flex rounded-lg border border-hairline-strong px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft"
          >
            목록으로 이동
          </Link>
          <Link
            href={`${listPath}/${linktreeId}`}
            className="inline-flex rounded-lg border border-hairline-strong px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft"
          >
            분류 상세로 이동
          </Link>
        </div>
      </section>
    );
  }

  if (!linktree || !item) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
        <p className="text-sm text-ink-muted">링크 데이터를 불러올 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
        Settings / Linktree
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">링크 상세</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted md:text-base">
        링크 정보를 확인하고, 권한이 있으면 수정 화면으로 이동하거나 삭제할 수 있습니다.
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-danger-hairline bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 rounded-lg border border-hairline p-4">
        <p className="text-xs font-semibold text-ink-muted">분류</p>
        <p className="mt-1 text-base font-semibold text-ink wrap-anywhere">
          {linktree.name}
        </p>

        <p className="mt-4 text-xs font-semibold text-ink-muted">링크 이름</p>
        <p className="mt-1 text-base font-semibold text-ink wrap-anywhere">{item.name}</p>

        <p className="mt-4 text-xs font-semibold text-ink-muted">링크 주소</p>
        {/* 상세 화면에서는 주소 전체를 보여줘야 하므로 자르지 않고 임의 위치에서
            줄바꿈한다(공백 없는 긴 URL 이 좁은 화면을 밀어내는 것을 막는다). */}
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block max-w-full text-sm text-primary-text underline underline-offset-2 wrap-anywhere"
        >
          {item.link}
        </a>
        <p className="mt-4 text-xs text-ink-muted">
          생성일: {formatKoreanDate(item.createdAt)}
        </p>
        <LastUpdatedMeta
          updatedAt={item.updatedAt}
          updatedBy={item.updatedBy}
          className="mt-1 text-xs text-ink-muted"
        />

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={listPath}
            className="rounded-lg border border-hairline-strong px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-canvas-soft"
          >
            목록으로
          </Link>
          <Link
            href={`${listPath}/${linktree.id}`}
            className="rounded-lg border border-hairline-strong px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-canvas-soft"
          >
            분류 상세로
          </Link>

          {canWrite ? (
            <>
              <Link
                href={`${listPath}/${linktree.id}/items/${item.id}/edit`}
                className="rounded-lg border border-hairline-strong px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-canvas-soft"
              >
                링크 수정
              </Link>
              <button
                type="button"
                data-testid="linktree-item-delete"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="rounded-lg border border-danger-hairline px-3 py-1.5 text-xs font-semibold text-danger-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                링크 삭제
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <AuditHistoryPanel resourceType="linktree_item" resourceId={item.id} />
      </div>
    </section>
  );
}
