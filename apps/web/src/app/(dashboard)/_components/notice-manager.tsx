"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../lib/admin-api/resources";
import { AdminApiError, type ApiGenerationNotice, type ApiGlobalNotice } from "../../../lib/admin-api/types";
import { formatKoreanDate } from "../../../lib/date-formatters";

type NoticeScope = "generation" | "global";

type NoticeItem = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  author: {
    id: string;
    name: string;
    image: string | null;
    role: string | null;
  };
};

type NoticeManagerProps = {
  scope: NoticeScope;
  generationId?: string;
  canWrite: boolean;
  heading: string;
  description: string;
  emptyMessage: string;
};

const normalizeNotices = (
  notices: ApiGenerationNotice[] | ApiGlobalNotice[],
): NoticeItem[] => {
  return notices.map((notice) => ({
    id: notice.id,
    title: notice.title,
    content: notice.content,
    createdAt: notice.createdAt,
    updatedAt: notice.updatedAt,
    author: notice.author,
  }));
};

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

const buildRoleLabel = (role: string | null): string => {
  switch (role) {
    case "president":
      return "회장";
    case "vice_president":
      return "부회장";
    case "manager":
      return "부장";
    case "new_member":
      return "신입부원";
    case "associate_member":
      return "준회원";
    case "regular_member":
      return "정회원";
    case "unverified":
      return "미승인";
    default:
      return "역할 미지정";
  }
};

export default function NoticeManager({
  scope,
  generationId,
  canWrite,
  heading,
  description,
  emptyMessage,
}: NoticeManagerProps) {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");

  const generationIdOrNull = useMemo(
    () => (scope === "generation" ? generationId ?? null : null),
    [generationId, scope],
  );

  const loadNotices = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (scope === "generation") {
        if (!generationIdOrNull) {
          setNotices([]);
          return;
        }

        const rows = await adminResourceApi.listGenerationNotices(generationIdOrNull);
        setNotices(normalizeNotices(rows));
        return;
      }

      const rows = await adminResourceApi.listGlobalNotices();
      setNotices(normalizeNotices(rows));
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
      setNotices([]);
    } finally {
      setIsLoading(false);
    }
  }, [generationIdOrNull, scope]);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  const handleCreateNotice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle || !nextContent) {
      setErrorMessage("제목과 본문을 모두 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (scope === "generation") {
        if (!generationIdOrNull) {
          throw new Error("기수 정보가 없습니다.");
        }

        await adminResourceApi.createGenerationNotice(generationIdOrNull, {
          title: nextTitle,
          content: nextContent,
        });
      } else {
        await adminResourceApi.createGlobalNotice({
          title: nextTitle,
          content: nextContent,
        });
      }

      setTitle("");
      setContent("");
      await loadNotices();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (notice: NoticeItem) => {
    setEditingNoticeId(notice.id);
    setEditingTitle(notice.title);
    setEditingContent(notice.content);
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    setEditingNoticeId(null);
    setEditingTitle("");
    setEditingContent("");
  };

  const handleUpdateNotice = async (noticeId: string) => {
    const nextTitle = editingTitle.trim();
    const nextContent = editingContent.trim();

    if (!nextTitle || !nextContent) {
      setErrorMessage("제목과 본문을 모두 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (scope === "generation") {
        if (!generationIdOrNull) {
          throw new Error("기수 정보가 없습니다.");
        }

        await adminResourceApi.updateGenerationNotice(generationIdOrNull, noticeId, {
          title: nextTitle,
          content: nextContent,
        });
      } else {
        await adminResourceApi.updateGlobalNotice(noticeId, {
          title: nextTitle,
          content: nextContent,
        });
      }

      cancelEditing();
      await loadNotices();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    const shouldDelete = window.confirm("공지를 삭제하시겠습니까?");
    if (!shouldDelete) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (scope === "generation") {
        if (!generationIdOrNull) {
          throw new Error("기수 정보가 없습니다.");
        }

        await adminResourceApi.deleteGenerationNotice(generationIdOrNull, noticeId);
      } else {
        await adminResourceApi.deleteGlobalNotice(noticeId);
      }

      if (editingNoticeId === noticeId) {
        cancelEditing();
      }

      await loadNotices();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Notices</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">{heading}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">{description}</p>

      {canWrite ? (
        <form className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleCreateNotice}>
          <p className="text-sm font-semibold text-slate-900">새 공지 작성</p>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSaving}
            placeholder="공지 제목"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={isSaving}
            placeholder="공지 본문"
            rows={4}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "공지 등록"}
          </button>
        </form>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          공지 작성/수정/삭제는 회장, 부회장, 부장만 가능합니다.
        </p>
      )}

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">공지 목록을 불러오는 중입니다...</p>
      ) : notices.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {notices.map((notice) => {
            const isEditing = editingNoticeId === notice.id;

            return (
              <li key={notice.id} className="rounded-xl border border-slate-200 p-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      disabled={isSaving}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                      disabled={isSaving}
                      rows={4}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-base font-semibold text-slate-900">{notice.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {notice.content}
                    </p>
                  </>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  작성자: {notice.author.name} ({buildRoleLabel(notice.author.role)}) · 작성일: {formatKoreanDate(notice.createdAt)}
                  {notice.updatedAt !== notice.createdAt
                    ? ` · 수정일: ${formatKoreanDate(notice.updatedAt)}`
                    : ""}
                </p>

                {canWrite ? (
                  <div className="mt-3 flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleUpdateNotice(notice.id)}
                          disabled={isSaving}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          저장
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
                          onClick={() => startEditing(notice)}
                          disabled={isSaving}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteNotice(notice.id)}
                          disabled={isSaving}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
