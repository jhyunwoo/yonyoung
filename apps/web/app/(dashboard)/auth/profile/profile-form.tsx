"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  STUDENT_NUMBER_REGEX,
  formatKoreanMobilePhoneNumber,
  isKoreanMobilePhoneNumber,
} from "@/shared/contracts/auth-profile";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";
import { AdminApiError } from "@/shared/http/http";
import { type ApiMemberProfileUpdateInput } from "@/shared/contracts/api-contracts";
import {
  AUTH_PROFILE_PATH,
  hasCompletedRequiredProfile,
  isUnverifiedRole,
  resolvePostSignInPath,
} from "@/features/auth/model/auth-shared";

type ProfileFormMode = "auth" | "dashboard";

type ProfileFormProps = {
  userId: string;
  role: string | null;
  mode?: ProfileFormMode;
  initialProfile: {
    image: string;
    familyName: string;
    givenName: string;
    college: string;
    department: string;
    studentNumber: string;
    phoneNumber: string;
    collaborationAvailable: boolean;
    personalLink: string;
  };
};

type FieldErrors = Partial<
  Record<
    | "familyName"
    | "givenName"
    | "college"
    | "department"
    | "studentNumber"
    | "phoneNumber"
    | "personalLink",
    string
  >
>;

const DEFAULT_SAVE_ERROR_MESSAGE =
  "기본 정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
const AUTH_COLLEGE_PLACEHOLDER = "인공지능융합대학";
const AUTH_DEPARTMENT_PLACEHOLDER = "컴퓨터과학과";

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return DEFAULT_SAVE_ERROR_MESSAGE;
};

const validateForm = (input: {
  familyName: string;
  givenName: string;
  college: string;
  department: string;
  studentNumber: string;
  phoneNumber: string;
  personalLink: string;
}): FieldErrors => {
  const errors: FieldErrors = {};

  if (!input.familyName.trim()) {
    errors.familyName = "성을 입력해 주세요.";
  }
  if (!input.givenName.trim()) {
    errors.givenName = "이름을 입력해 주세요.";
  }
  if (!input.college.trim()) {
    errors.college = "대학명을 입력해 주세요.";
  }
  if (!input.department.trim()) {
    errors.department = "학과명을 입력해 주세요.";
  }
  if (!STUDENT_NUMBER_REGEX.test(input.studentNumber.trim())) {
    errors.studentNumber = "학번은 숫자 10자리여야 합니다.";
  }
  if (!isKoreanMobilePhoneNumber(input.phoneNumber.trim())) {
    errors.phoneNumber = "핸드폰 번호는 010-0000-0000 형식이어야 합니다.";
  }
  const personalLink = input.personalLink.trim();
  if (personalLink.length > 0) {
    try {
      const url = new URL(personalLink);
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.personalLink = "개인 링크는 http:// 또는 https://로 시작해야 합니다.";
      }
    } catch {
      errors.personalLink = "개인 링크는 올바른 링크 주소 형식이어야 합니다.";
    }
  }

  return errors;
};

export default function AuthProfileForm({
  userId,
  role,
  mode = "auth",
  initialProfile,
}: ProfileFormProps) {
  const router = useRouter();
  const canEditProfileImage = useMemo(
    () => role !== null && !isUnverifiedRole(role),
    [role],
  );

  const [profileImage, setProfileImage] = useState(initialProfile.image);
  const [familyName, setFamilyName] = useState(initialProfile.familyName);
  const [givenName, setGivenName] = useState(initialProfile.givenName);
  const [college, setCollege] = useState(initialProfile.college);
  const [department, setDepartment] = useState(initialProfile.department);
  const [studentNumber, setStudentNumber] = useState(initialProfile.studentNumber);
  const [phoneNumber, setPhoneNumber] = useState(initialProfile.phoneNumber);
  const [collaborationAvailable, setCollaborationAvailable] = useState(
    initialProfile.collaborationAvailable,
  );
  const [personalLink, setPersonalLink] = useState(initialProfile.personalLink);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageObjectUrl, setSelectedImageObjectUrl] = useState<string | null>(
    null,
  );
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);

  const isDashboardMode = mode === "dashboard";

  useEffect(() => {
    return () => {
      if (selectedImageObjectUrl) {
        URL.revokeObjectURL(selectedImageObjectUrl);
      }
    };
  }, [selectedImageObjectUrl]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    if (selectedImageObjectUrl) {
      URL.revokeObjectURL(selectedImageObjectUrl);
      setSelectedImageObjectUrl(null);
    }

    setSelectedImageFile(nextFile);
    if (!nextFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);
    setSelectedImageObjectUrl(objectUrl);
  };

  const handleProfileImageUploadClick = () => {
    if (!canEditProfileImage || isSaving) {
      return;
    }

    profileFileInputRef.current?.click();
  };

  const handlePhoneNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(formatKoreanMobilePhoneNumber(event.target.value));
  };

  const handleStudentNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStudentNumber(event.target.value.replace(/\D/g, "").slice(0, 10));
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm({
      familyName,
      givenName,
      college,
      department,
      studentNumber,
      phoneNumber,
      personalLink,
    });
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
      let nextImageValue = profileImage.trim();

      if (canEditProfileImage && selectedImageFile) {
        setUploadProgressPercent(0);
        nextImageValue = await uploadWithPresign({
          presignPath: PRESIGN_PATHS.userProfile,
          file: selectedImageFile,
          onProgress: setUploadProgressPercent,
        });
      }

      const trimmedPersonalLink = personalLink.trim();

      const payload: ApiMemberProfileUpdateInput = {
        familyName: familyName.trim(),
        givenName: givenName.trim(),
        college: college.trim(),
        department: department.trim(),
        studentNumber: studentNumber.trim(),
        phoneNumber: phoneNumber.trim(),
        collaborationAvailable,
      };
      if (trimmedPersonalLink.length > 0) {
        payload.personalLink = trimmedPersonalLink;
      }

      if (canEditProfileImage) {
        payload.image = nextImageValue.length > 0 ? nextImageValue : null;
      }

      const updatedUser = await adminResourceApi.updateUser(userId, payload);

      setProfileImage(updatedUser.image ?? "");
      setCollaborationAvailable(updatedUser.collaborationAvailable);
      setPersonalLink(updatedUser.personalLink ?? "");
      if (selectedImageObjectUrl) {
        URL.revokeObjectURL(selectedImageObjectUrl);
      }
      setSelectedImageObjectUrl(null);
      setSelectedImageFile(null);
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

  const imagePreviewUrl = selectedImageObjectUrl ?? profileImage;

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
          <div className="rounded-lg border border-hairline p-4">
            <p className="text-sm font-semibold text-ink">프로필 이미지</p>
            <p className="mt-1 text-xs text-ink-muted">
              {canEditProfileImage
                ? "프로필 사진을 수정할 수 있습니다."
                : "현재 권한에서는 프로필 사진을 수정할 수 없습니다."}
            </p>

            <div className="mt-3 flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 aspect-square overflow-hidden rounded-full border border-hairline bg-surface-sunken">
                {imagePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreviewUrl}
                    alt="프로필 이미지 미리보기"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-ink-muted">
                    없음
                  </div>
                )}
              </div>

              <button
                type="button"
                data-testid="auth-profile-image-select"
                onClick={handleProfileImageUploadClick}
                disabled={!canEditProfileImage || isSaving}
                className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
              >
                사진 선택
              </button>
              <input
                ref={profileFileInputRef}
                type="file"
                accept="image/*"
                disabled={!canEditProfileImage || isSaving}
                onChange={handleImageChange}
                className="sr-only"
              />
            </div>

            <UploadProgressBar progressPercent={uploadProgressPercent} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">성</span>
              <input
                value={familyName}
                onChange={(event) => setFamilyName(event.target.value)}
                disabled={isSaving}
                className="rounded-lg border border-hairline-strong px-3 py-2"
                autoComplete="family-name"
              />
              {fieldErrors.familyName ? (
                <span className="text-xs text-danger-text">{fieldErrors.familyName}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">이름</span>
              <input
                value={givenName}
                onChange={(event) => setGivenName(event.target.value)}
                disabled={isSaving}
                className="rounded-lg border border-hairline-strong px-3 py-2"
                autoComplete="given-name"
              />
              {fieldErrors.givenName ? (
                <span className="text-xs text-danger-text">{fieldErrors.givenName}</span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">대학명</span>
              <input
                value={college}
                onChange={(event) => setCollege(event.target.value)}
                disabled={isSaving}
                className="rounded-lg border border-hairline-strong px-3 py-2"
                placeholder={isDashboardMode ? undefined : AUTH_COLLEGE_PLACEHOLDER}
              />
              {fieldErrors.college ? (
                <span className="text-xs text-danger-text">{fieldErrors.college}</span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">학과명</span>
              <input
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                disabled={isSaving}
                className="rounded-lg border border-hairline-strong px-3 py-2"
                placeholder={isDashboardMode ? undefined : AUTH_DEPARTMENT_PLACEHOLDER}
              />
              {fieldErrors.department ? (
                <span className="text-xs text-danger-text">{fieldErrors.department}</span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">학번 (10자리)</span>
              <input
                value={studentNumber}
                onChange={handleStudentNumberChange}
                inputMode="numeric"
                disabled={isSaving}
                className="rounded-lg border border-hairline-strong px-3 py-2"
                placeholder="2026000123"
              />
              {fieldErrors.studentNumber ? (
                <span className="text-xs text-danger-text">
                  {fieldErrors.studentNumber}
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">핸드폰 번호</span>
              <input
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                inputMode="tel"
                disabled={isSaving}
                className="rounded-lg border border-hairline-strong px-3 py-2"
                placeholder="010-0000-0000"
              />
              {fieldErrors.phoneNumber ? (
                <span className="text-xs text-danger-text">
                  {fieldErrors.phoneNumber}
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">협업 가능 여부</span>
              <select
                value={collaborationAvailable ? "true" : "false"}
                onChange={(event) =>
                  setCollaborationAvailable(event.target.value === "true")
                }
                disabled={isSaving}
                className="rounded-lg border border-hairline-strong px-3 py-2"
              >
                <option value="true">가능</option>
                <option value="false">불가</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">개인 링크 (선택)</span>
              <input
                value={personalLink}
                onChange={(event) => setPersonalLink(event.target.value)}
                disabled={isSaving}
                className="rounded-lg border border-hairline-strong px-3 py-2"
                placeholder="https://example.com/my-link"
                inputMode="url"
              />
              {fieldErrors.personalLink ? (
                <span className="text-xs text-danger-text">
                  {fieldErrors.personalLink}
                </span>
              ) : null}
            </label>
          </div>

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
