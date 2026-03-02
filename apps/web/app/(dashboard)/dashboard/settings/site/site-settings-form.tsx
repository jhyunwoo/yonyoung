"use client";

import { DEFAULT_SITE_SETTINGS } from "@/shared/contracts/api-contracts";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { AdminApiError } from "@/shared/http/http";
import {
  type ApiSiteSettings,
  type ApiUpdateSiteSettingsInput,
} from "@/shared/contracts/api-contracts";
import { Skeleton } from "@/components/ui/skeleton";

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "기본 설정 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
};

const normalizeInput = (
  state: ApiSiteSettings,
): ApiUpdateSiteSettingsInput => ({
  footerOpenChatUrl: state.footerOpenChatUrl.trim(),
  footerInstagramId: state.footerInstagramId.trim().replace(/^@+/, ""),
  footerEmail: state.footerEmail.trim(),
  footerPhone: state.footerPhone.trim(),
  footerAddress: state.footerAddress.trim(),
  donateBankName: state.donateBankName.trim(),
  donateAccountNumber: state.donateAccountNumber.trim(),
  donateAccountHolder: state.donateAccountHolder.trim(),
});

export default function SiteSettingsForm() {
  const router = useRouter();
  const [formState, setFormState] = useState<ApiSiteSettings>({
    ...DEFAULT_SITE_SETTINGS,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSiteSettings = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await adminResourceApi.getSiteSettings();
        if (!isMounted) {
          return;
        }
        setFormState(data);
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

    void loadSiteSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (field: keyof ApiSiteSettings, value: string) => {
    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = normalizeInput(formState);
      const updated = await adminResourceApi.updateSiteSettings(payload);
      setFormState(updated);
      setSuccessMessage("기본 설정을 저장했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={`site-settings-loading-field-${index + 1}`} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        Settings / Site
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
        기본 설정
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
        홈페이지 하단 연락처와 후원 계좌 정보를 수정할 수 있습니다.
        저장하면 홈페이지와 후원 페이지에 바로 반영됩니다.
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              오픈 카톡방 링크
            </span>
            <input
              type="url"
              value={formState.footerOpenChatUrl}
              onChange={(event) =>
                updateField("footerOpenChatUrl", event.target.value)
              }
              className={inputClassName}
              placeholder="https://open.kakao.com/..."
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              인스타그램 아이디
            </span>
            <div className="flex items-center gap-1">
              <p>@</p>
              <input
                type="text"
                value={formState.footerInstagramId}
                onChange={(event) =>
                  updateField("footerInstagramId", event.target.value)
                }
                className={inputClassName}
                placeholder="yonyoungpage"
                required
              />
            </div>
            <span className="text-xs text-slate-500">
              @ 없이 아이디만 입력하면 됩니다.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">이메일</span>
            <input
              type="email"
              value={formState.footerEmail}
              onChange={(event) =>
                updateField("footerEmail", event.target.value)
              }
              className={inputClassName}
              placeholder="example@yonyoung.com"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              전화번호
            </span>
            <input
              type="text"
              value={formState.footerPhone}
              onChange={(event) =>
                updateField("footerPhone", event.target.value)
              }
              className={inputClassName}
              placeholder="010-0000-0000"
              required
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">주소</span>
          <textarea
            value={formState.footerAddress}
            onChange={(event) =>
              updateField("footerAddress", event.target.value)
            }
            className={`${inputClassName} min-h-24 resize-y`}
            placeholder="주소를 입력하세요."
            required
          />
        </label>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
          <h2 className="text-base font-semibold text-slate-900">
            후원 계좌 설정
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">은행</span>
              <input
                type="text"
                value={formState.donateBankName}
                onChange={(event) =>
                  updateField("donateBankName", event.target.value)
                }
                className={inputClassName}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                계좌번호
              </span>
              <input
                type="text"
                value={formState.donateAccountNumber}
                onChange={(event) =>
                  updateField("donateAccountNumber", event.target.value)
                }
                className={inputClassName}
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                예금주
              </span>
              <input
                type="text"
                value={formState.donateAccountHolder}
                onChange={(event) =>
                  updateField("donateAccountHolder", event.target.value)
                }
                className={inputClassName}
                required
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </section>
  );
}
