"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiLinktree } from "@/shared/contracts/api-contracts";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { formatAuditActor } from "@/features/dashboard/ui/audit-display";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import {
  normalizeLinktreeItemInput,
  readLinktreeErrorMessage,
} from "@/app/(dashboard)/_components/linktree-shared";
import { useConfirm } from "@/app/(dashboard)/_components/ui/confirm-provider";

type LinktreeGroupDetailProps = {
  initialLinktree: ApiLinktree;
  canWrite: boolean;
  listPath: string;
};

export default function LinktreeGroupDetail({
  initialLinktree,
  canWrite,
  listPath,
}: LinktreeGroupDetailProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const linktreeId = initialLinktree.id;
  const [linktree, setLinktree] = useState<ApiLinktree>(initialLinktree);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemLink, setNewItemLink] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isValidHttpUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "이 분류를 삭제하시겠습니까?",
      description: "분류에 속한 링크도 함께 삭제되며 되돌릴 수 없습니다.",
      confirmLabel: "삭제",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.deleteLinktree(linktreeId);
      router.replace(listPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(readLinktreeErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddItem = async () => {
    if (!canWrite) {
      return;
    }

    const normalizedItem = normalizeLinktreeItemInput({
      name: newItemName,
      link: newItemLink,
    });

    if (!normalizedItem.name) {
      setErrorMessage("링크 이름을 입력해 주세요.");
      return;
    }

    if (!normalizedItem.link || !isValidHttpUrl(normalizedItem.link)) {
      setErrorMessage("링크 주소는 http:// 또는 https://로 시작해야 합니다.");
      return;
    }

    setIsAddingItem(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.addLinktreeItem(linktreeId, normalizedItem);
      const refreshedLinktree = await adminResourceApi.getLinktreeById(linktreeId);
      setLinktree(refreshedLinktree);
      setNewItemName("");
      setNewItemLink("");
      router.refresh();
    } catch (error) {
      setErrorMessage(readLinktreeErrorMessage(error));
    } finally {
      setIsAddingItem(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
        Settings / Linktree
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">링크 분류 상세</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted md:text-base">
        분류 정보와 하위 링크를 확인할 수 있고, 권한이 있으면 분류를 수정하거나 삭제할 수
        있습니다.
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-danger-hairline bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 rounded-lg border border-hairline p-4">
        <p className="text-xl font-semibold text-ink wrap-anywhere">{linktree.name}</p>
        <p className="mt-2 text-xs text-ink-muted">링크 {linktree.items.length}개</p>
        <p className="mt-1 text-xs text-ink-muted">
          생성일: {formatKoreanDate(linktree.createdAt)}
        </p>
        <LastUpdatedMeta
          updatedAt={linktree.updatedAt}
          updatedBy={linktree.updatedBy}
          className="mt-1 text-xs text-ink-muted"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={listPath}
            className="rounded-lg border border-hairline-strong px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-canvas-soft"
          >
            목록으로
          </Link>

          {canWrite ? (
            <>
              <Link
                href={`${listPath}/${linktree.id}/edit`}
                className="rounded-lg border border-hairline-strong px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-canvas-soft"
              >
                분류 수정
              </Link>
              <button
                type="button"
                data-testid="linktree-group-delete"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="rounded-lg border border-danger-hairline px-3 py-1.5 text-xs font-semibold text-danger-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                분류 삭제
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-hairline p-4">
        <p className="text-sm font-semibold text-ink">하위 링크</p>

        {canWrite ? (
          <form action={handleAddItem} className="mt-3 space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <input
                data-testid="linktree-group-item-name-input"
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                disabled={isAddingItem || isDeleting}
                placeholder="링크 이름"
                className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm"
              />
              <input
                data-testid="linktree-group-item-link-input"
                value={newItemLink}
                onChange={(event) => setNewItemLink(event.target.value)}
                disabled={isAddingItem || isDeleting}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm"
              />
            </div>
            <FormSubmitButton
              data-testid="linktree-group-item-add-submit"
              disabled={isAddingItem || isDeleting}
              className="rounded-lg border border-hairline-strong px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-canvas-soft disabled:cursor-not-allowed disabled:opacity-60"
              idleLabel="하위 링크 추가"
              pendingLabel="추가 중..."
            />
          </form>
        ) : null}

        {linktree.items.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-hairline-strong bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
            등록된 링크가 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {linktree.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`${listPath}/${linktree.id}/items/${item.id}`}
                  className="block rounded-lg border border-hairline px-3 py-2 text-sm text-ink-secondary transition hover:bg-surface-sunken"
                >
                  <span className="font-medium text-ink wrap-anywhere">{item.name}</span>
                  <span className="ml-2 text-xs text-ink-muted">상세 보기</span>
                  <span className="mt-1 block text-[11px] text-ink-muted">
                    최근 수정: {formatKoreanDate(item.updatedAt)} ·{" "}
                    {formatAuditActor(item.updatedBy)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <AuditHistoryPanel resourceType="linktree" resourceId={linktree.id} />
      </div>
    </section>
  );
}
