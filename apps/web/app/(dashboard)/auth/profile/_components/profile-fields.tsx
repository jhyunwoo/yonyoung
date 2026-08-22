"use client";

import type {
  ProfileFieldErrors,
  ProfileFormValues,
} from "@/features/auth/profile/profile-form-model";
import {
  normalizePhoneNumberInput,
  normalizeStudentNumberInput,
} from "@/features/auth/profile/profile-form-model";

const AUTH_COLLEGE_PLACEHOLDER = "인공지능융합대학";
const AUTH_DEPARTMENT_PLACEHOLDER = "컴퓨터과학과";

type ProfileFieldsProps = {
  values: ProfileFormValues;
  errors: ProfileFieldErrors;
  isSaving: boolean;
  isDashboardMode: boolean;
  onChange: (patch: Partial<ProfileFormValues>) => void;
};

const FieldError = ({ message }: { message?: string }) =>
  message ? <span className="text-xs text-danger-text">{message}</span> : null;

export default function ProfileFields({
  values,
  errors,
  isSaving,
  isDashboardMode,
  onChange,
}: ProfileFieldsProps) {
  const inputClassName = "rounded-lg border border-hairline-strong px-3 py-2";

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">성</span>
          <input
            value={values.familyName}
            onChange={(event) => onChange({ familyName: event.target.value })}
            disabled={isSaving}
            className={inputClassName}
            autoComplete="family-name"
          />
          <FieldError message={errors.familyName} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">이름</span>
          <input
            value={values.givenName}
            onChange={(event) => onChange({ givenName: event.target.value })}
            disabled={isSaving}
            className={inputClassName}
            autoComplete="given-name"
          />
          <FieldError message={errors.givenName} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">대학명</span>
          <input
            value={values.college}
            onChange={(event) => onChange({ college: event.target.value })}
            disabled={isSaving}
            className={inputClassName}
            placeholder={isDashboardMode ? undefined : AUTH_COLLEGE_PLACEHOLDER}
          />
          <FieldError message={errors.college} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">학과명</span>
          <input
            value={values.department}
            onChange={(event) => onChange({ department: event.target.value })}
            disabled={isSaving}
            className={inputClassName}
            placeholder={isDashboardMode ? undefined : AUTH_DEPARTMENT_PLACEHOLDER}
          />
          <FieldError message={errors.department} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">학번 (10자리)</span>
          <input
            value={values.studentNumber}
            onChange={(event) =>
              onChange({
                studentNumber: normalizeStudentNumberInput(event.target.value),
              })
            }
            inputMode="numeric"
            disabled={isSaving}
            className={inputClassName}
            placeholder="2026000123"
          />
          <FieldError message={errors.studentNumber} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">핸드폰 번호</span>
          <input
            value={values.phoneNumber}
            onChange={(event) =>
              onChange({
                phoneNumber: normalizePhoneNumberInput(event.target.value),
              })
            }
            inputMode="tel"
            disabled={isSaving}
            className={inputClassName}
            placeholder="010-0000-0000"
          />
          <FieldError message={errors.phoneNumber} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">협업 가능 여부</span>
          <select
            value={values.collaborationAvailable ? "true" : "false"}
            onChange={(event) =>
              onChange({ collaborationAvailable: event.target.value === "true" })
            }
            disabled={isSaving}
            className={inputClassName}
          >
            <option value="true">가능</option>
            <option value="false">불가</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">개인 링크 (선택)</span>
          <input
            value={values.personalLink}
            onChange={(event) => onChange({ personalLink: event.target.value })}
            disabled={isSaving}
            className={inputClassName}
            placeholder="https://example.com/my-link"
            inputMode="url"
          />
          <FieldError message={errors.personalLink} />
        </label>
      </div>
    </>
  );
}
