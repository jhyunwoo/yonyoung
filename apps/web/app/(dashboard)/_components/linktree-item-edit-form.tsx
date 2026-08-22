"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiLinktree, ApiLinktreeItem } from "@/shared/contracts/api-contracts";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import {
  normalizeLinktreeItemInput,
  readLinktreeErrorMessage,
} from "@/app/(dashboard)/_components/linktree-shared";

type LinktreeItemEditFormProps = {
  linktree: ApiLinktree;
  item: ApiLinktreeItem;
  listPath: string;
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export default function LinktreeItemEditForm({
  linktree,
  item,
  listPath,
}: LinktreeItemEditFormProps) {
  const router = useRouter();
  const linktreeId = linktree.id;
  const itemId = item.id;

  const [name, setName] = useState(item.name);
  const [link, setLink] = useState(item.link);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const normalized = normalizeLinktreeItemInput({ name, link });
    if (!normalized.name) {
      setErrorMessage("링크 이름을 입력해 주세요.");
      return;
    }

    if (!normalized.link || !isValidHttpUrl(normalized.link)) {
      setErrorMessage("http:// 또는 https://로 시작하는 링크 주소를 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.updateLinktreeItem(linktreeId, itemId, normalized);
      router.replace(`${listPath}/${linktreeId}/items/${itemId}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(readLinktreeErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
        Settings / Linktree
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">링크 수정</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted md:text-base">
        링크 이름과 링크 주소를 수정할 수 있습니다.
      </p>

      {errorMessage ? (
        <p className="mt-6 rounded-lg border border-danger-hairline bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {errorMessage}
        </p>
      ) : null}

      <form
        className="mt-6 space-y-3 rounded-lg border border-hairline bg-surface-sunken p-4"
        action={handleSubmit}
      >
        <p className="text-sm font-semibold text-ink">분류: {linktree.name}</p>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">링크 이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">링크 주소</span>
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <FormSubmitButton
            data-testid="linktree-item-edit-submit"
            disabled={isSaving}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="저장"
            pendingLabel="저장 중..."
          />
          <Link
            href={`${listPath}/${linktreeId}/items/${itemId}`}
            className="rounded-lg border border-hairline-strong px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
