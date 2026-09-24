import { describe, expect, it } from "vitest";
import { resolveUploadContentType } from "@/features/dashboard/api/admin-api/upload";

const file = (name: string, type: string) => ({ name, type });

describe("resolveUploadContentType", () => {
  it("Windows가 보고하는 zip 별칭을 표준 MIME으로 바꾼다", () => {
    expect(resolveUploadContentType(file("자료.zip", "application/x-zip-compressed"))).toBe(
      "application/zip",
    );
  });

  it("브라우저가 타입을 비우면 확장자로 판정한다", () => {
    expect(resolveUploadContentType(file("회계.hwp", ""))).toBe("application/x-hwp");
    expect(resolveUploadContentType(file("회계.HWPX", ""))).toBe("application/vnd.hancom.hwpx");
    expect(resolveUploadContentType(file("photo.JPEG", ""))).toBe("image/jpeg");
    expect(resolveUploadContentType(file("photo.heic", ""))).toBe("image/heic");
  });

  it("allowlist 밖의 보고값은 확장자로 바로잡는다", () => {
    expect(resolveUploadContentType(file("회계.hwpx", "application/octet-stream"))).toBe(
      "application/vnd.hancom.hwpx",
    );
  });

  it("허용된 보고값은 그대로 쓴다", () => {
    expect(resolveUploadContentType(file("a.png", "image/png"))).toBe("image/png");
    expect(resolveUploadContentType(file("a.pdf", "application/pdf; charset=binary"))).toBe(
      "application/pdf",
    );
  });

  it("판정할 수 없는 파일은 이미지로 위장하지 않고 원래 값을 서버에 넘긴다", () => {
    expect(resolveUploadContentType(file("run.exe", ""))).toBe("application/octet-stream");
    expect(resolveUploadContentType(file("a.bmp", "image/bmp"))).toBe("image/bmp");
  });
});
