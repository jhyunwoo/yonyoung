"use client";

import type { ApiLinktree } from "@/shared/contracts/api-contracts";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import {
  normalizeLinktreeName,
  readLinktreeErrorMessage,
} from "@/app/(dashboard)/_components/linktree-shared";

type LinktreeGroupEditFormProps = {
  linktree: ApiLinktree;
  listPath: string;
};

export default function LinktreeGroupEditForm({
  linktree,
  listPath,
}: LinktreeGroupEditFormProps) {
  const router = useRouter();
  const linktreeId = linktree.id;
  const [name, setName] = useState(linktree.name);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const normalizedName = normalizeLinktreeName(name);
    if (!normalizedName) {
      setErrorMessage("분류 이름을 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.updateLinktree(linktreeId, {
        name: normalizedName,
      });
      router.replace(`${listPath}/${linktreeId}`);
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
      <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">링크 분류 수정</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted md:text-base">
        분류 이름을 바꾼 뒤 저장할 수 있습니다.
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
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">분류 이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <FormSubmitButton
            data-testid="linktree-group-edit-submit"
            disabled={isSaving}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="저장"
            pendingLabel="저장 중..."
          />
          <Link
            href={`${listPath}/${linktreeId}`}
            className="rounded-lg border border-hairline-strong px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft"
          >
            취소
          </Link>
        </div>
      </form>
    </section>
  );
}
