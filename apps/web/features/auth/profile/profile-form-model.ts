import {
  STUDENT_NUMBER_REGEX,
  formatKoreanMobilePhoneNumber,
  isKoreanMobilePhoneNumber,
} from "@/shared/contracts/auth-profile";
import type { ApiMemberProfileUpdateInput } from "@/shared/contracts/api-contracts";

export type ProfileFormValues = {
  familyName: string;
  givenName: string;
  college: string;
  department: string;
  studentNumber: string;
  phoneNumber: string;
  collaborationAvailable: boolean;
  personalLink: string;
};

export type ProfileFieldName = Exclude<keyof ProfileFormValues, "collaborationAvailable">;

export type ProfileFieldErrors = Partial<Record<ProfileFieldName, string>>;

const isHttpUrl = (value: string): boolean => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export const validateProfileForm = (values: ProfileFormValues): ProfileFieldErrors => {
  const errors: ProfileFieldErrors = {};

  if (!values.familyName.trim()) {
    errors.familyName = "성을 입력해 주세요.";
  }
  if (!values.givenName.trim()) {
    errors.givenName = "이름을 입력해 주세요.";
  }
  if (!values.college.trim()) {
    errors.college = "대학명을 입력해 주세요.";
  }
  if (!values.department.trim()) {
    errors.department = "학과명을 입력해 주세요.";
  }
  if (!STUDENT_NUMBER_REGEX.test(values.studentNumber.trim())) {
    errors.studentNumber = "학번은 숫자 10자리여야 합니다.";
  }
  if (!isKoreanMobilePhoneNumber(values.phoneNumber.trim())) {
    errors.phoneNumber = "핸드폰 번호는 010-0000-0000 형식이어야 합니다.";
  }

  const personalLink = values.personalLink.trim();
  if (personalLink.length > 0 && !isHttpUrl(personalLink)) {
    errors.personalLink = personalLink.includes("://")
      ? "개인 링크는 http:// 또는 https://로 시작해야 합니다."
      : "개인 링크는 올바른 링크 주소 형식이어야 합니다.";
  }

  return errors;
};

/**
 * 저장 payload를 만든다.
 * - 비어 있는 개인 링크는 키 자체를 보내지 않는다(서버가 빈 문자열을 거절한다).
 * - 프로필 이미지를 수정할 수 없는 권한이면 image 키를 아예 넣지 않는다.
 */
export const buildProfileUpdatePayload = (input: {
  values: ProfileFormValues;
  canEditProfileImage: boolean;
  imageUrl: string;
}): ApiMemberProfileUpdateInput => {
  const payload: ApiMemberProfileUpdateInput = {
    familyName: input.values.familyName.trim(),
    givenName: input.values.givenName.trim(),
    college: input.values.college.trim(),
    department: input.values.department.trim(),
    studentNumber: input.values.studentNumber.trim(),
    phoneNumber: input.values.phoneNumber.trim(),
    collaborationAvailable: input.values.collaborationAvailable,
  };

  const personalLink = input.values.personalLink.trim();
  if (personalLink.length > 0) {
    payload.personalLink = personalLink;
  }

  if (input.canEditProfileImage) {
    const image = input.imageUrl.trim();
    payload.image = image.length > 0 ? image : null;
  }

  return payload;
};

/** 학번 입력은 숫자만 10자리까지 받는다. */
export const normalizeStudentNumberInput = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 10);

export const normalizePhoneNumberInput = (value: string): string =>
  formatKoreanMobilePhoneNumber(value);
