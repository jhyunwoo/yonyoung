"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "../../../lib/admin-api/resources";
import { PRESIGN_PATHS, uploadWithPresign } from "../../../lib/admin-api/upload";
import { AdminApiError, type ApiSupporter } from "../../../lib/admin-api/types";
import { formatKoreanDate } from "../../../lib/date-formatters";
import { shouldUseUnoptimizedImage } from "../../../lib/image-utils";
import AuditHistoryPanel from "./audit-history-panel";
import LastUpdatedMeta from "./last-updated-meta";
import {
  formatTimestampToDateInput,
  parseDateInputToTimestamp,
  readSupporterErrorMessage,
} from "./supporter-shared";

type SupporterDetailProps = {
  supporterId: string;
  canWrite: boolean;
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

export default function SupporterDetail({
  supporterId,
  canWrite,
  listPath,
}: SupporterDetailProps) {
  const router = useRouter();
  const [supporter, setSupporter] = useState<ApiSupporter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingLink, setEditingLink] = useState("");
  const [editingExpiresAt, setEditingExpiresAt] = useState("");
  const [editingLogoFile, setEditingLogoFile] = useState<File | null>(null);

  const loadSupporter = useCallback(async () => {
    setIsLoading(true);
    setIsNotFound(false);
    setErrorMessage(null);

    try {
      const entity = await adminResourceApi.getSupporterById(supporterId);
      setSupporter(entity);
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 404) {
        setIsNotFound(true);
        setSupporter(null);
      } else {
        setErrorMessage(readSupporterErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  }, [supporterId]);

  useEffect(() => {
    void loadSupporter();
  }, [loadSupporter]);

  const startEditing = () => {
    if (!supporter) {
      return;
    }

    setEditingName(supporter.name);
    setEditingLink(supporter.link);
    setEditingExpiresAt(formatTimestampToDateInput(supporter.expiresAt));
    setEditingLogoFile(null);
    setIsEditing(true);
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingName("");
    setEditingLink("");
    setEditingExpiresAt("");
    setEditingLogoFile(null);
    setErrorMessage(null);
  };

  const handleUpdateSupporter = async () => {
    if (!supporter) {
      return;
    }

    const nextName = editingName.trim();
    const nextLink = editingLink.trim();
    if (!nextName) {
      setErrorMessage("후원사 이름을 입력해 주세요.");
      return;
    }
    if (!nextLink) {
      setErrorMessage("후원사 링크를 입력해 주세요.");
      return;
    }
    if (!isValidHttpUrl(nextLink)) {
      setErrorMessage("후원사 링크는 http 또는 https URL이어야 합니다.");
      return;
    }

    const nextExpiresAt = parseDateInputToTimestamp(editingExpiresAt);
    if (nextExpiresAt === null) {
      setErrorMessage("만료일을 올바르게 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let nextLogoUrl = supporter.logoUrl;
      if (editingLogoFile) {
        nextLogoUrl = await uploadWithPresign({
          presignPath: PRESIGN_PATHS.supporterLogo,
          file: editingLogoFile,
        });
      }

      const updated = await adminResourceApi.updateSupporter(supporter.id, {
        name: nextName,
        link: nextLink,
        expiresAt: nextExpiresAt,
        logoUrl: nextLogoUrl,
      });

      setSupporter(updated);
      setEditingLogoFile(null);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(readSupporterErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSupporter = async () => {
    const shouldDelete = window.confirm("후원사를 삭제하시겠습니까?");
    if (!shouldDelete) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.deleteSupporter(supporterId);
      router.replace(listPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(readSupporterErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm text-slate-500">후원사 정보를 불러오는 중입니다...</p>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Supporters</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">후원사 상세</h1>
        <p className="mt-3 text-sm text-slate-600">존재하지 않는 후원사이거나 접근할 수 없습니다.</p>
        <Link
          href={listPath}
          className="mt-6 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          목록으로 이동
        </Link>
      </section>
    );
  }

  if (!supporter) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm text-slate-500">후원사 데이터를 불러올 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Supporters</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">후원사 상세</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
        후원사 상세 정보를 확인하고 필요한 경우 수정 또는 삭제할 수 있습니다.
      </p>

      {!canWrite ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          후원사 수정/삭제는 회장, 부회장, 부장만 가능합니다.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 p-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          <Image
            src={supporter.logoUrl}
            alt={supporter.name}
            fill
            className="object-cover"
            unoptimized={shouldUseUnoptimizedImage(supporter.logoUrl)}
            sizes="(max-width: 1024px) 100vw, 320px"
          />
        </div>

        <div className="space-y-3">
          {isEditing ? (
            <>
              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-900">후원사 이름</span>
                <input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  disabled={isSaving}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-900">후원사 링크</span>
                <input
                  type="url"
                  value={editingLink}
                  onChange={(event) => setEditingLink(event.target.value)}
                  disabled={isSaving}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-900">만료일</span>
                <input
                  type="date"
                  value={editingExpiresAt}
                  onChange={(event) => setEditingExpiresAt(event.target.value)}
                  disabled={isSaving}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-slate-900">로고 파일</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setEditingLogoFile(event.target.files?.[0] ?? null)}
                  disabled={isSaving}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-500">
                  {editingLogoFile
                    ? `선택됨: ${editingLogoFile.name}`
                    : "파일을 선택하지 않으면 기존 로고를 유지합니다."}
                </p>
              </label>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">{supporter.name}</h2>
              <p className="text-sm text-slate-600">
                만료일: {formatKoreanDate(supporter.expiresAt)}
              </p>
              <a
                href={supporter.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm text-blue-700 underline-offset-2 hover:underline"
              >
                {supporter.link}
              </a>
            </>
          )}

          <p className="text-xs text-slate-500">생성일: {formatKoreanDate(supporter.createdAt)}</p>
          <LastUpdatedMeta
            updatedAt={supporter.updatedAt}
            updatedBy={supporter.updatedBy}
            className="text-xs text-slate-500"
          />

          <div className="flex flex-wrap gap-2">
            <Link
              href={listPath}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              목록으로
            </Link>

            {canWrite ? (
              isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleUpdateSupporter()}
                    disabled={isSaving}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "저장 중..." : "저장"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startEditing}
                    disabled={isSaving}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSupporter()}
                    disabled={isSaving}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    삭제
                  </button>
                </>
              )
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AuditHistoryPanel resourceType="supporter" resourceId={supporter.id} />
      </div>
    </section>
  );
}
