"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import type {
  ApiMemberProfileUpdateInput,
  ApiUser,
} from "../../../../lib/admin-api/types";
import { hasCompletedRequiredProfile } from "../../../../lib/auth-shared";
import { readErrorMessage } from "../components/admin-form-utils";
import AdminActionButton from "../components/admin-action-button";
import AdminInfoBox from "../components/admin-info-box";
import AdminPageHeader from "../components/admin-page-header";

type ProfilePageClientProps = {
  userId: string;
};

type ProfileFormState = {
  name: string;
  nickname: string;
  familyName: string;
  givenName: string;
  college: string;
  department: string;
  studentNumber: string;
  phoneNumber: string;
};

const emptyForm: ProfileFormState = {
  name: "",
  nickname: "",
  familyName: "",
  givenName: "",
  college: "",
  department: "",
  studentNumber: "",
  phoneNumber: "",
};

const STUDENT_NUMBER_PATTERN = /^\d{10}$/;

const toTrimmed = (value: string): string => value.trim();

/**
 * ProfilePageClient 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param { userId } 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function ProfilePageClient({ userId }: ProfilePageClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const syncForm = (user: ApiUser) => {
    setForm({
      name: user.name,
      nickname: user.nickname ?? "",
      familyName: user.familyName ?? "",
      givenName: user.givenName ?? "",
      college: user.college ?? "",
      department: user.department ?? "",
      studentNumber: user.studentNumber ?? "",
      phoneNumber: user.phoneNumber ?? "",
    });
  };

  useEffect(/** useEffect 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
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
        syncForm(user);
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
  }, [userId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      return;
    }

    const studentNumber = toTrimmed(form.studentNumber);
    if (!STUDENT_NUMBER_PATTERN.test(studentNumber)) {
      setErrorMessage("학번은 숫자 10자리로 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: ApiMemberProfileUpdateInput = {
        name: toTrimmed(form.name),
        nickname: toTrimmed(form.nickname) || null,
        familyName: toTrimmed(form.familyName),
        givenName: toTrimmed(form.givenName),
        college: toTrimmed(form.college),
        department: toTrimmed(form.department),
        studentNumber,
        phoneNumber: toTrimmed(form.phoneNumber),
      };

      await adminResourceApi.updateUser(profile.id, payload);
      setSuccessMessage("프로필 정보를 저장했습니다. 관리자 메인으로 이동합니다.");
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-profile-page">
      <AdminPageHeader
        title="내 프로필"
        description="관리자 계정의 기본 학적 정보를 입력/수정합니다."
        guidance="성, 이름, 대학, 학과, 학번(10자리), 전화번호는 모두 필수입니다."
      />

      <AdminInfoBox title="필수 입력 안내">
        로그인 후 필수 프로필 정보가 비어 있으면 이 화면으로 자동 이동합니다.
      </AdminInfoBox>

      {errorMessage ? (
        <p
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          data-testid="admin-profile-error"
        >
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p
          className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700"
          data-testid="admin-profile-success"
        >
          {successMessage}
        </p>
      ) : null}

      {isLoading ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">프로필 정보를 불러오는 중...</p>
        </section>
      ) : profile ? (
        <form
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
          data-testid="admin-profile-form"
          onSubmit={handleSubmit}
        >
          <label className="block text-sm">
            <span className="mb-1 block">표시 이름</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, name: event.target.value }))
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
              data-testid="admin-profile-name"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block">별칭 (선택)</span>
            <input
              type="text"
              value={form.nickname}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, nickname: event.target.value }))
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              data-testid="admin-profile-nickname"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block">성</span>
              <input
                type="text"
                value={form.familyName}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, familyName: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="admin-profile-family-name"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block">이름</span>
              <input
                type="text"
                value={form.givenName}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, givenName: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="admin-profile-given-name"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block">대학</span>
              <input
                type="text"
                value={form.college}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, college: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="admin-profile-college"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block">학과</span>
              <input
                type="text"
                value={form.department}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, department: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="admin-profile-department"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block">학번 (10자리)</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\\d{10}"
                value={form.studentNumber}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    studentNumber: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="admin-profile-student-number"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block">전화번호</span>
              <input
                type="text"
                value={form.phoneNumber}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, phoneNumber: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="admin-profile-phone-number"
              />
            </label>
          </div>

          {!isProfileComplete ? (
            <p className="text-sm text-amber-700" data-testid="admin-profile-incomplete-hint">
              필수 항목이 비어 있습니다. 모두 입력 후 저장해 주세요.
            </p>
          ) : null}

          <div className="flex gap-2">
            <AdminActionButton
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="저장 중..."
              testId="admin-profile-submit"
            >
              저장하고 계속하기
            </AdminActionButton>
          </div>
        </form>
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        </section>
      )}
    </div>
  );
}
