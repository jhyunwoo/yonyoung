"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { STUDENT_NUMBER_REGEX } from "@repo/shared-auth/profile";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS } from "../../../../lib/admin-api/upload";
import type {
  ApiMemberProfileUpdateInput,
  ApiUser,
} from "../../../../lib/admin-api/types";
import { hasCompletedRequiredProfile } from "../../../../lib/auth-shared";
import { readErrorMessage } from "../components/admin-form-utils";
import AdminActionButton from "../components/admin-action-button";
import ImageInput from "../components/image-input";
import { useImmediateImageUpload } from "../components/use-immediate-image-upload";

type ProfilePageClientProps = {
  userId: string;
  mode?: "admin" | "auth";
  successRedirectPath?: string;
};

type ProfileFormState = {
  familyName: string;
  givenName: string;
  college: string;
  department: string;
  studentNumber: string;
  phoneNumber: string;
};

const emptyForm: ProfileFormState = {
  familyName: "",
  givenName: "",
  college: "",
  department: "",
  studentNumber: "",
  phoneNumber: "",
};

const toTrimmed = (value: string): string => value.trim();

const fieldLabelClassName =
  "mb-1.5 block text-sm font-medium text-[var(--admin-text-secondary)]";
const fieldInputClassName =
  "w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2.5 text-sm text-[var(--admin-text-primary)] shadow-sm transition focus:border-[var(--admin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-border-strong)] placeholder:text-[var(--admin-text-muted)]";
const requiredFieldItems = [
  "성",
  "이름",
  "대학",
  "학과",
  "학번(10자리)",
  "전화번호",
];

/**
 * ProfilePageClient 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param { userId } 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function ProfilePageClient({
  userId,
  mode = "admin",
  successRedirectPath = "/admin",
}: ProfilePageClientProps) {
  const router = useRouter();
  const isAuthMode = mode === "auth";
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const imageUpload = useImmediateImageUpload({ presignPath: PRESIGN_PATHS.userProfile });
  const resetImageUpload = imageUpload.reset;

  const isProfileComplete = useMemo(() => {
    return hasCompletedRequiredProfile({
      familyName: toTrimmed(form.familyName),
      givenName: toTrimmed(form.givenName),
      college: toTrimmed(form.college),
      department: toTrimmed(form.department),
      studentNumber: toTrimmed(form.studentNumber),
      phoneNumber: toTrimmed(form.phoneNumber),
    });
  }, [form]);

  useEffect(
    /** useEffect 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
      let isMounted = true;

      /**
       * loadProfile 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
       * @returns 외부 소스에서 읽어 온 결과를 Promise로 반환합니다.
       * @remarks 네트워크 실패/타임아웃 상황을 고려해 예외 처리와 기본값 규약을 유지해야 합니다.
       */
      const loadProfile = async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
          const user = await adminResourceApi.getUserById(userId);
          if (!isMounted) {
            return;
          }
          setProfile(user);
          setForm({
            familyName: user.familyName ?? "",
            givenName: user.givenName ?? "",
            college: user.college ?? "",
            department: user.department ?? "",
            studentNumber: user.studentNumber ?? "",
            phoneNumber: user.phoneNumber ?? "",
          });
          resetImageUpload(user.image);
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

      void loadProfile();
      return /** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
        isMounted = false;
      };
    },
    [resetImageUpload, userId],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      return;
    }

    const studentNumber = toTrimmed(form.studentNumber);
    if (!STUDENT_NUMBER_REGEX.test(studentNumber)) {
      setErrorMessage("학번은 숫자 10자리로 입력해 주세요.");
      return;
    }
    if (imageUpload.isUploading || imageUpload.hasUploadError) {
      setErrorMessage("프로필 이미지 업로드를 완료한 뒤 저장해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: ApiMemberProfileUpdateInput = {
        familyName: toTrimmed(form.familyName),
        givenName: toTrimmed(form.givenName),
        college: toTrimmed(form.college),
        department: toTrimmed(form.department),
        studentNumber,
        phoneNumber: toTrimmed(form.phoneNumber),
        image: imageUpload.currentUrl.trim() || null,
      };

      await adminResourceApi.updateUser(profile.id, payload);
      setSuccessMessage("기본 정보를 저장했습니다. 계속 진행합니다.");
      router.replace(successRedirectPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageTitle = isAuthMode ? "기본 정보 입력" : "내 프로필";
  const pageDescription = isAuthMode
    ? "회원가입 직후 필요한 정보를 입력하면 바로 서비스 이용을 시작할 수 있습니다."
    : "관리자 계정의 학적/연락처 정보를 최신 상태로 유지해 주세요.";
  const pageGuidance = isAuthMode
    ? "미인증 상태에서도 저장할 수 있으며, 입력 완료 후 자동으로 다음 화면으로 이동합니다."
    : "필수 정보가 비어 있으면 관리자 페이지 진입 시 이 화면으로 이동합니다.";

  return (
    <div
      className={
        isAuthMode
          ? "mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12"
          : "w-full"
      }
    >
      <div className="space-y-6" data-testid="admin-profile-page">
        <section className="relative overflow-hidden rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.7)] md:p-8">
          <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[var(--admin-surface-subtle)] opacity-80 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-[var(--admin-surface-muted)] opacity-70 blur-2xl" />

          <div className="relative space-y-4">
            <span className="inline-flex items-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[var(--admin-text-muted)]">
              PROFILE SETUP
            </span>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)] md:text-3xl">
                {pageTitle}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-[var(--admin-text-secondary)]">
                {pageDescription}
              </p>
              <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
                {pageGuidance}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] px-2.5 py-1 font-medium text-[var(--admin-text-secondary)]">
                필수 항목 6개
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 font-medium ${
                  isProfileComplete
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-amber-300 bg-amber-50 text-amber-700"
                }`}
              >
                {isProfileComplete ? "입력 완료" : "입력 필요"}
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            {errorMessage ? (
              <p
                className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
                data-testid="admin-profile-error"
              >
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p
                className="rounded-xl border border-green-300 bg-green-50 px-3.5 py-2.5 text-sm text-green-700"
                data-testid="admin-profile-success"
              >
                {successMessage}
              </p>
            ) : null}

            {isLoading ? (
              <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.65)]">
                <p className="text-sm text-[var(--admin-text-muted)]">
                  프로필 정보를 불러오는 중...
                </p>
              </section>
            ) : profile ? (
              <form
                className="space-y-6 rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.65)] md:p-7"
                data-testid="admin-profile-form"
                onSubmit={handleSubmit}
              >
                <section className="space-y-4">
                  <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">
                    기본 학적 정보
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className={fieldLabelClassName}>성</span>
                      <input
                        type="text"
                        value={form.familyName}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            familyName: event.target.value,
                          }))
                        }
                        placeholder="예: 김"
                        className={fieldInputClassName}
                        required
                        data-testid="admin-profile-family-name"
                      />
                    </label>

                    <label className="block">
                      <span className={fieldLabelClassName}>이름</span>
                      <input
                        type="text"
                        value={form.givenName}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            givenName: event.target.value,
                          }))
                        }
                        placeholder="예: 연영"
                        className={fieldInputClassName}
                        required
                        data-testid="admin-profile-given-name"
                      />
                    </label>

                    <label className="block">
                      <span className={fieldLabelClassName}>대학</span>
                      <input
                        type="text"
                        value={form.college}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            college: event.target.value,
                          }))
                        }
                        placeholder="예: 문과대학"
                        className={fieldInputClassName}
                        required
                        data-testid="admin-profile-college"
                      />
                    </label>

                    <label className="block">
                      <span className={fieldLabelClassName}>학과</span>
                      <input
                        type="text"
                        value={form.department}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            department: event.target.value,
                          }))
                        }
                        placeholder="예: 국어국문학과"
                        className={fieldInputClassName}
                        required
                        data-testid="admin-profile-department"
                      />
                    </label>

                    <label className="block">
                      <span className={fieldLabelClassName}>학번 (10자리)</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        value={form.studentNumber}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            studentNumber: event.target.value,
                          }))
                        }
                        placeholder="예: 2026000123"
                        className={fieldInputClassName}
                        required
                        data-testid="admin-profile-student-number"
                      />
                    </label>

                    <label className="block">
                      <span className={fieldLabelClassName}>전화번호</span>
                      <input
                        type="text"
                        value={form.phoneNumber}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            phoneNumber: event.target.value,
                          }))
                        }
                        placeholder="예: 010-1234-5678"
                        className={fieldInputClassName}
                        required
                        data-testid="admin-profile-phone-number"
                      />
                    </label>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">
                    프로필 이미지
                  </h2>
                  <ImageInput
                    label="프로필 이미지"
                    file={imageUpload.file}
                    onFileChange={imageUpload.selectFile}
                    currentUrl={imageUpload.currentUrl}
                    status={imageUpload.status}
                    errorMessage={imageUpload.errorMessage}
                    onRetry={imageUpload.retry}
                    uploadProgress={imageUpload.progress}
                    isUploading={imageUpload.isUploading}
                    disabled={isSubmitting}
                    testIdPrefix="admin-profile-image"
                  />
                </section>

                {!isProfileComplete ? (
                  <p
                    className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700"
                    data-testid="admin-profile-incomplete-hint"
                  >
                    필수 항목이 비어 있습니다. 모두 입력 후 저장해 주세요.
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] pt-4">
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    저장 후 자동으로 다음 화면으로 이동합니다.
                  </p>
                  <AdminActionButton
                    type="submit"
                    disabled={isSubmitting || imageUpload.isUploading || imageUpload.hasUploadError}
                    loading={isSubmitting}
                    loadingText="저장 중..."
                    className="min-w-[182px] rounded-xl border-[var(--admin-accent)] bg-[var(--admin-accent)] px-4 py-2.5 font-semibold text-[var(--admin-bg-primary)] shadow-sm transition hover:brightness-110 disabled:border-[var(--admin-border-strong)] disabled:bg-[var(--admin-border-strong)] disabled:text-[var(--admin-bg-primary)]"
                    testId="admin-profile-submit"
                  >
                    저장하고 계속하기
                  </AdminActionButton>
                </div>
              </form>
            ) : (
              <section className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.65)]">
                <p className="text-sm text-[var(--admin-text-muted)]">
                  프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                </p>
              </section>
            )}
          </div>

          <aside className="h-fit space-y-4">
            <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.6)]">
              <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">
                입력 가이드
              </h2>
              <p className="mt-2 text-xs leading-5 text-[var(--admin-text-secondary)]">
                {isAuthMode
                  ? "가입 절차를 마치기 위해 필수 정보를 먼저 입력해 주세요."
                  : "관리자 화면에서 사용하는 계정 정보를 최신으로 유지해 주세요."}
              </p>

              <ul className="mt-3 space-y-2 text-xs text-[var(--admin-text-muted)]">
                {requiredFieldItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--admin-accent)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] p-4">
              <h3 className="text-xs font-semibold tracking-[0.08em] text-[var(--admin-text-secondary)]">
                FORMAT TIP
              </h3>
              <p className="mt-2 text-xs leading-5 text-[var(--admin-text-muted)]">
                학번은 숫자 10자리 형식만 저장됩니다. 하이픈이나 공백 없이
                입력해 주세요.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
