import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 첨부파일 서버 액션 테스트.
 * admin-write-core의 writeRequest를 모킹해, 각 액션이 scope에 맞는
 * 접근 범위(accessScope)와 캐시 태그, API 경로를 전달하는지 검증한다.
 */

// vi.mock은 파일 최상단으로 호이스팅되므로 mock 함수도 vi.hoisted로 함께 끌어올린다
const { writeRequestMock } = vi.hoisted(() => ({
  writeRequestMock: vi.fn(async () => ({ ok: true, data: null })),
}));

vi.mock("@/features/dashboard/actions/admin-write-core", () => ({
  writeRequest: writeRequestMock,
  readNoContentSchema: { __noContent: true },
}));

import {
  createAttachmentAction,
  deleteAttachmentAction,
  updateAttachmentAction,
} from "@/features/dashboard/actions/attachments";

const baseCreateInput = {
  scope: "site_donate" as const,
  title: "회계 자료",
  fileUrl: "https://api.example.com/api/public/media/site/u/file/x.pdf?sig=a",
  fileName: "x.pdf",
  fileSize: 1024,
  mimeType: "application/pdf",
};

describe("attachments server actions", () => {
  beforeEach(() => {
    writeRequestMock.mockClear();
  });

  it("site_donate 생성은 leadership 범위와 attachments 태그로 요청한다", async () => {
    await createAttachmentAction(baseCreateInput);

    expect(writeRequestMock).toHaveBeenCalledTimes(1);
    const arg = writeRequestMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.path).toBe("/attachments");
    expect(arg.method).toBe("POST");
    expect(arg.accessScope).toBe("leadership");
    expect(arg.tags).toEqual(["admin:attachments", "public:attachments"]);
  });

  it("activity 생성은 manager 범위로 요청한다", async () => {
    await createAttachmentAction({
      ...baseCreateInput,
      scope: "activity",
      resourceId: "20000000-0000-4000-8000-000000000001",
      fileUrl:
        "https://api.example.com/api/public/media/activities/u/file/x.pdf?sig=a",
    });

    const arg = writeRequestMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.accessScope).toBe("manager");
  });

  it("수정 액션은 scope로 접근 범위를 결정한다", async () => {
    await updateAttachmentAction("attach-1", "activity", { title: "변경" });

    const arg = writeRequestMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.path).toBe("/attachments/attach-1");
    expect(arg.method).toBe("PATCH");
    expect(arg.accessScope).toBe("manager");
  });

  it("삭제 액션은 DELETE + no-content 스키마로 요청한다", async () => {
    await deleteAttachmentAction("attach-1", "site_donate");

    const arg = writeRequestMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.path).toBe("/attachments/attach-1");
    expect(arg.method).toBe("DELETE");
    expect(arg.accessScope).toBe("leadership");
  });

  it("잘못된 생성 입력은 zod 검증에서 예외를 던진다", async () => {
    await expect(
      createAttachmentAction({ ...baseCreateInput, title: "" }),
    ).rejects.toThrow();
    expect(writeRequestMock).not.toHaveBeenCalled();
  });

  it("링크(linkUrl)만 전달하는 생성도 허용한다", async () => {
    await createAttachmentAction({
      scope: "site_donate",
      title: "회계 구글 시트",
      linkUrl: "https://docs.google.com/spreadsheets/d/abc",
    });

    expect(writeRequestMock).toHaveBeenCalledTimes(1);
    const arg = writeRequestMock.mock.calls[0]![0] as {
      body: Record<string, unknown>;
    };
    expect(arg.body.linkUrl).toBe("https://docs.google.com/spreadsheets/d/abc");
    expect(arg.body.fileUrl).toBeUndefined();
  });

  it("파일 필드 세트와 linkUrl을 동시에 전달하면 zod 검증에서 예외를 던진다", async () => {
    await expect(
      createAttachmentAction({
        ...baseCreateInput,
        linkUrl: "https://docs.google.com/spreadsheets/d/abc",
      }),
    ).rejects.toThrow();
    expect(writeRequestMock).not.toHaveBeenCalled();
  });

  it("파일 필드 세트가 불완전하면 zod 검증에서 예외를 던진다", async () => {
    await expect(
      createAttachmentAction({
        scope: "site_donate",
        title: "회계 자료",
        fileUrl: "https://api.example.com/api/public/media/site/u/file/x.pdf?sig=a",
      }),
    ).rejects.toThrow();
    expect(writeRequestMock).not.toHaveBeenCalled();
  });

  it("http(s)가 아닌 linkUrl은 zod 검증에서 예외를 던진다", async () => {
    await expect(
      createAttachmentAction({
        scope: "site_donate",
        title: "회계 자료",
        linkUrl: "ftp://example.com/report.pdf",
      }),
    ).rejects.toThrow();
    expect(writeRequestMock).not.toHaveBeenCalled();
  });
});
