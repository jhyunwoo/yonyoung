import { describe, expect, it } from "vitest";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  IMAGE_UPLOAD_ACCEPT,
  normalizeUploadContentType,
} from "@yonyoung/contracts/uploads";

describe("normalizeUploadContentType", () => {
  it("브라우저별 별칭을 표준 MIME으로 맞춘다", () => {
    expect(normalizeUploadContentType("application/x-zip-compressed")).toBe(
      "application/zip",
    );
    expect(normalizeUploadContentType("application/haansofthwpx")).toBe(
      "application/vnd.hancom.hwpx",
    );
    expect(normalizeUploadContentType("image/jpg")).toBe("image/jpeg");
  });

  it("대소문자·공백·파라미터를 정리한다", () => {
    expect(
      normalizeUploadContentType(" Application/PDF; charset=binary "),
    ).toBe("application/pdf");
    expect(normalizeUploadContentType("")).toBe("");
  });

  it("알 수 없는 타입은 그대로 둔다", () => {
    expect(normalizeUploadContentType("image/bmp")).toBe("image/bmp");
  });
});

describe("IMAGE_UPLOAD_ACCEPT", () => {
  it("서버 이미지 allowlist와 같은 목록이다", () => {
    expect(IMAGE_UPLOAD_ACCEPT.split(",")).toEqual([
      ...ALLOWED_IMAGE_CONTENT_TYPES,
    ]);
  });
});
