"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";
import { AdminApiError } from "@/shared/http/http";
import {
  AUTH_PROFILE_PATH,
  hasCompletedRequiredProfile,
  isUnverifiedRole,
  resolvePostSignInPath,
} from "@/features/auth/model/auth-shared";
import {
  buildProfileUpdatePayload,
  validateProfileForm,
  type ProfileFieldErrors,
  type ProfileFormValues,
} from "@/features/auth/profile/profile-form-model";
import { useProfileImageSelection } from "@/features/auth/profile/use-profile-image-selection";
import ProfileFields from "@/app/(dashboard)/auth/profile/_components/profile-fields";
import ProfileImageField from "@/app/(dashboard)/auth/profile/_components/profile-image-field";

type ProfileFormMode = "auth" | "dashboard";

type ProfileFormProps = {
  userId: string;
  role: string | null;
  mode?: ProfileFormMode;
  initialProfile: ProfileFormValues & { image: string };
};

const DEFAULT_SAVE_ERROR_MESSAGE =
  "기본 정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return DEFAULT_SAVE_ERROR_MESSAGE;
};

export default function AuthProfileForm({
  userId,
  role,
  mode = "auth",
  initialProfile,
}: ProfileFormProps) {
  const router = useRouter();
  const canEditProfileImage = role !== null && !isUnverifiedRole(role);
  const isDashboardMode = mode === "dashboard";

  const [values, setValues] = useState<ProfileFormValues>({
    familyName: initialProfile.familyName,
    givenName: initialProfile.givenName,
    college: initialProfile.college,
    department: initialProfile.department,
    studentNumber: initialProfile.studentNumber,
    phoneNumber: initialProfile.phoneNumber,
    collaborationAvailable: initialProfile.collaborationAvailable,
    personalLink: initialProfile.personalLink,
  });
  const image = useProfileImageSelection(initialProfile.image);

  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);

  const handleSubmit = async () => {
    const validationErrors = validateProfileForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setSubmitError(null);
      setSubmitSuccess(null);
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSaving(true);

    try {
      let nextImageUrl = image.imageUrl;

      if (canEditProfileImage && image.selectedFile) {
        setUploadProgressPercent(0);
        nextImageUrl = await uploadWithPresign({
          presignPath: PRESIGN_PATHS.userProfile,
          file: image.selectedFile,
          onProgress: setUploadProgressPercent,
        });
      }

      const updatedUser = await adminResourceApi.updateUser(
        userId,
        buildProfileUpdatePayload({
          values,
          canEditProfileImage,
          imageUrl: nextImageUrl,
        }),
      );

      setValues((previous) => ({
        ...previous,
        collaborationAvailable: updatedUser.collaborationAvailable,
        personalLink: updatedUser.personalLink ?? "",
      }));
      image.reset(updatedUser.image ?? "");
      setUploadProgressPercent(null);

      if (!isDashboardMode) {
        const redirectPath = resolvePostSignInPath({
          role: updatedUser.role ?? role,
          isProfileComplete: hasCompletedRequiredProfile(
            updatedUser as unknown as Record<string, unknown>,
          ),
        });

        if (redirectPath !== AUTH_PROFILE_PATH) {
          router.replace(redirectPath);
          return;
        }
      }

      setSubmitSuccess(
        isDashboardMode ? "개인 프로필이 저장되었습니다." : "기본 정보가 저장되었습니다.",
      );
      router.refresh();
    } catch (error) {
      setUploadProgressPercent(null);
      setSubmitError(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSubmit();
  };

  // 대시보드 모드에서는 셸이 이미 <main> 을 소유하므로 <div> 로 렌더한다
  // (랜드마크 중첩 방지). /auth/profile 은 셸 밖이라 스스로 <main> 이 된다.
  const Root = isDashboardMode ? "div" : "main";

  return (
    <Root
      className={
        isDashboardMode
          ? "px-4 py-6 md:px-8 md:py-8"
          : "flex min-h-dvh w-full items-center justify-center bg-canvas px-4 py-12 text-ink"
      }
    >
      <section
        className={
          isDashboardMode
            ? "mx-auto w-full max-w-3xl rounded-lg border border-hairline bg-surface p-6 md:p-8"
            : "w-full max-w-2xl rounded-lg border border-hairline bg-surface p-6 md:p-8"
        }
      >
        <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
          {isDashboardMode ? "My Profile" : "Profile Setup"}
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          {isDashboardMode ? "개인 프로필" : "기본 정보 입력"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          {isDashboardMode
            ? "개인 정보와 프로필 사진을 수정할 수 있습니다."
            : "대시보드 이용을 위해 기본 정보를 입력해 주세요."}
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleFormSubmit} noValidate>
          <ProfileImageField
            previewUrl={image.previewUrl}
            canEdit={canEditProfileImage}
            isSaving={isSaving}
            uploadProgressPercent={uploadProgressPercent}
            fileInputRef={image.fileInputRef}
            onOpenFilePicker={() => {
              if (!canEditProfileImage || isSaving) {
                return;
              }
              image.openFilePicker();
            }}
            onSelectFile={image.selectFile}
          />

          <ProfileFields
            values={values}
            errors={fieldErrors}
            isSaving={isSaving}
            isDashboardMode={isDashboardMode}
            onChange={(patch) => setValues((previous) => ({ ...previous, ...patch }))}
          />

          {submitError ? <p className="text-sm text-danger-text">{submitError}</p> : null}
          {submitSuccess ? (
            <p className="text-sm text-success-text">{submitSuccess}</p>
          ) : null}

          <button
            type="submit"
            data-testid="auth-profile-submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            aria-busy={isSaving}
          >
            {isSaving ? "저장 중..." : isDashboardMode ? "프로필 저장" : "기본 정보 저장"}
          </button>
        </form>
      </section>
    </Root>
  );
}
