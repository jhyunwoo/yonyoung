"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import { useGuardedSubmit } from "@/shared/react/use-guarded-submit";
import {
  normalizeLinktreeItemInput,
  normalizeLinktreeName,
  readLinktreeErrorMessage,
} from "@/app/(dashboard)/_components/linktree-shared";
import { Skeleton } from "@/components/ui/skeleton";

type LinktreeCreateFormProps = {
  canWrite: boolean;
  listPath: string;
};

type LinktreeItemDraft = {
  id: number;
  name: string;
  link: string;
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const createItemDraft = (id: number): LinktreeItemDraft => ({
  id,
  name: "",
  link: "",
});

export default function LinktreeCreateForm({
  canWrite,
  listPath,
}: LinktreeCreateFormProps) {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [itemDrafts, setItemDrafts] = useState<LinktreeItemDraft[]>([createItemDraft(0)]);
  const [nextItemId, setNextItemId] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createdLinktreeRef = useRef<{ id: string; name: string } | null>(null);
  const addedDraftIdsRef = useRef(new Set<number>());

  useEffect(() => {
    if (canWrite) {
      return;
    }

    router.replace(listPath);
  }, [canWrite, listPath, router]);

  const handleAddItemDraft = () => {
    setItemDrafts((prev) => [...prev, createItemDraft(nextItemId)]);
    setNextItemId((prev) => prev + 1);
  };

  const handleRemoveItemDraft = (id: number) => {
    setItemDrafts((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  const handleUpdateItemDraft = (id: number, key: "name" | "link", value: string) => {
    setItemDrafts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  };

  const handleSubmit = async () => {
    const normalizedGroupName = normalizeLinktreeName(groupName);
    if (!normalizedGroupName) {
      setErrorMessage("분류 이름을 입력해 주세요.");
      return;
    }

    const normalizedDrafts = itemDrafts
      .map((draft) => ({ draftId: draft.id, item: normalizeLinktreeItemInput(draft) }))
      .filter(({ item }) => item.name.length > 0 || item.link.length > 0);
    const normalizedItems = normalizedDrafts.map(({ item }) => item);

    if (normalizedItems.length === 0) {
      setErrorMessage("링크를 1개 이상 입력해 주세요.");
      return;
    }

    for (const [index, item] of normalizedItems.entries()) {
      const itemNumber = index + 1;
      if (!item.name) {
        setErrorMessage(`${itemNumber}번째 링크 이름을 입력해 주세요.`);
        return;
      }

      if (!item.link || !isValidHttpUrl(item.link)) {
        setErrorMessage(
          `${itemNumber}번째 링크 주소는 http:// 또는 https://로 시작해야 합니다.`,
        );
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // 분류 생성과 링크 추가는 별도 요청이다. 중간에 실패한 뒤 다시 저장하면 같은 분류가
      // 하나 더 생기고 앞의 링크도 중복되므로, 이미 끝난 단계는 기억해 두고 건너뛴다.
      let linktreeId = createdLinktreeRef.current?.id ?? null;
      if (linktreeId === null) {
        const createdLinktree = await adminResourceApi.createLinktree({
          name: normalizedGroupName,
        });
        linktreeId = createdLinktree.id;
        createdLinktreeRef.current = { id: linktreeId, name: normalizedGroupName };
      } else if (createdLinktreeRef.current?.name !== normalizedGroupName) {
        await adminResourceApi.updateLinktree(linktreeId, { name: normalizedGroupName });
        createdLinktreeRef.current = { id: linktreeId, name: normalizedGroupName };
      }

      for (const { draftId, item } of normalizedDrafts) {
        if (addedDraftIdsRef.current.has(draftId)) {
          continue;
        }
        await adminResourceApi.addLinktreeItem(linktreeId, item);
        addedDraftIdsRef.current.add(draftId);
      }

      router.replace(`${listPath}/${linktreeId}`);
      router.refresh();
    } catch (error) {
      const message = readLinktreeErrorMessage(error);
      setErrorMessage(
        createdLinktreeRef.current
          ? `${message} 이미 저장된 분류와 링크는 유지되며, 다시 저장하면 남은 링크만 추가합니다.`
          : message,
      );
    } finally {
      setIsSaving(false);
    }
  };
  const submitForm = useGuardedSubmit(handleSubmit);

  if (!canWrite) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3 w-64" />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
        Settings / Linktree
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">링크 모음 생성</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted md:text-base">
        링크 분류를 만들고, 분류에 포함할 링크를 함께 등록할 수 있습니다.
      </p>

      {errorMessage ? (
        <p className="mt-6 rounded-lg border border-danger-hairline bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {errorMessage}
        </p>
      ) : null}

      <form
        data-testid="linktree-create-form"
        className="mt-6 space-y-4 rounded-lg border border-hairline bg-surface-sunken p-4"
        onSubmit={submitForm}
      >
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">분류 이름</span>
          <input
            data-testid="linktree-group-name-input"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            disabled={isSaving}
            placeholder="예: 공식 채널"
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink">링크 목록</p>
          {itemDrafts.map((item, index) => (
            <div
              key={item.id}
              className="rounded-lg border border-hairline bg-surface p-3"
            >
              <p className="text-xs font-semibold text-ink-muted">링크 {index + 1}</p>
              <div className="mt-2 space-y-2">
                <input
                  data-testid={`linktree-item-name-input-${index}`}
                  value={item.name}
                  onChange={(event) =>
                    handleUpdateItemDraft(item.id, "name", event.target.value)
                  }
                  disabled={isSaving}
                  placeholder="링크 이름"
                  className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm"
                />
                <input
                  data-testid={`linktree-item-link-input-${index}`}
                  value={item.link}
                  onChange={(event) =>
                    handleUpdateItemDraft(item.id, "link", event.target.value)
                  }
                  disabled={isSaving}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                data-testid={`linktree-item-delete-button-${index}`}
                onClick={() => handleRemoveItemDraft(item.id)}
                disabled={isSaving || itemDrafts.length <= 1}
                className="mt-2 rounded-lg border border-hairline-strong px-2 py-1 text-xs font-semibold text-ink-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                링크 삭제
              </button>
            </div>
          ))}

          <button
            data-testid="linktree-item-add-button"
            type="button"
            onClick={handleAddItemDraft}
            disabled={isSaving}
            className="rounded-lg border border-hairline-strong px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            링크 추가
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FormSubmitButton
            pending={isSaving}
            data-testid="linktree-create-submit"
            disabled={isSaving}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="링크 모음 생성"
            pendingLabel="생성 중..."
          />
          <Link
            href={listPath}
            className="rounded-lg border border-hairline-strong px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
