import { describe, expect, it } from "vitest";
import {
  buildProfileUpdatePayload,
  normalizePhoneNumberInput,
  normalizeStudentNumberInput,
  validateProfileForm,
  type ProfileFormValues,
} from "@/features/auth/profile/profile-form-model";

const VALID: ProfileFormValues = {
  familyName: "홍",
  givenName: "길동",
  college: "인공지능융합대학",
  department: "컴퓨터과학과",
  studentNumber: "2026000123",
  phoneNumber: "010-1234-5678",
  collaborationAvailable: true,
  personalLink: "",
};

describe("profile form validation", () => {
  it("모든 필수 항목이 채워지면 오류가 없다", () => {
    expect(validateProfileForm(VALID)).toEqual({});
  });

  it("공백만 있는 이름은 미입력으로 본다", () => {
    const errors = validateProfileForm({ ...VALID, familyName: "  " });
    expect(errors.familyName).toBe("성을 입력해 주세요.");
  });

  it("학번이 10자리가 아니면 거절한다", () => {
    expect(
      validateProfileForm({ ...VALID, studentNumber: "12345" }).studentNumber,
    ).toBe("학번은 숫자 10자리여야 합니다.");
  });

  it("휴대폰 형식이 아니면 거절한다", () => {
    expect(
      validateProfileForm({ ...VALID, phoneNumber: "02-123-4567" }).phoneNumber,
    ).toBe("핸드폰 번호는 010-0000-0000 형식이어야 합니다.");
  });

  it("개인 링크는 선택 항목이라 비어 있어도 통과한다", () => {
    expect(validateProfileForm({ ...VALID, personalLink: "" })).toEqual({});
  });

  it("http(s)가 아닌 스킴의 개인 링크는 거절한다", () => {
    expect(
      validateProfileForm({ ...VALID, personalLink: "javascript://alert(1)" })
        .personalLink,
    ).toBe("개인 링크는 http:// 또는 https://로 시작해야 합니다.");
  });

  it("링크 형식 자체가 아니면 형식 오류로 안내한다", () => {
    expect(
      validateProfileForm({ ...VALID, personalLink: "not a url" }).personalLink,
    ).toBe("개인 링크는 올바른 링크 주소 형식이어야 합니다.");
  });
});

describe("profile update payload", () => {
  it("입력값의 공백을 정리해서 담는다", () => {
    const payload = buildProfileUpdatePayload({
      values: { ...VALID, familyName: " 홍 ", givenName: " 길동 " },
      canEditProfileImage: false,
      imageUrl: "",
    });

    expect(payload.familyName).toBe("홍");
    expect(payload.givenName).toBe("길동");
  });

  it("비어 있는 개인 링크는 키 자체를 보내지 않는다", () => {
    const payload = buildProfileUpdatePayload({
      values: { ...VALID, personalLink: "   " },
      canEditProfileImage: false,
      imageUrl: "",
    });

    expect("personalLink" in payload).toBe(false);
  });

  it("이미지 수정 권한이 없으면 image 키를 넣지 않는다", () => {
    const payload = buildProfileUpdatePayload({
      values: VALID,
      canEditProfileImage: false,
      imageUrl: "https://cdn.example/a.jpg",
    });

    expect("image" in payload).toBe(false);
  });

  it("이미지 수정 권한이 있고 URL이 비면 null로 지운다", () => {
    const payload = buildProfileUpdatePayload({
      values: VALID,
      canEditProfileImage: true,
      imageUrl: "   ",
    });

    expect(payload.image).toBeNull();
  });

  it("이미지 수정 권한이 있으면 URL을 그대로 담는다", () => {
    const payload = buildProfileUpdatePayload({
      values: VALID,
      canEditProfileImage: true,
      imageUrl: "https://cdn.example/a.jpg",
    });

    expect(payload.image).toBe("https://cdn.example/a.jpg");
  });
});

describe("profile input normalizers", () => {
  it("학번 입력은 숫자만 10자리까지 남긴다", () => {
    expect(normalizeStudentNumberInput("2026-000-123456")).toBe("2026000123");
  });

  it("휴대폰 입력은 하이픈 형식으로 정리한다", () => {
    expect(normalizePhoneNumberInput("01012345678")).toBe("010-1234-5678");
  });
});
