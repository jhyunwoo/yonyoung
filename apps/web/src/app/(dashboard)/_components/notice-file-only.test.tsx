import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NoticeCreateForm from "./notice-create-form";
import NoticeDetail from "./notice-detail";
import NoticeEditForm from "./notice-edit-form";

const routerReplace = vi.fn();
const routerRefresh = vi.fn();
const getGlobalNoticeById = vi.fn();
const uploadWithPresign = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerReplace,
    refresh: routerRefresh,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = {
      ...props,
    } as Record<string, unknown>;
    delete rest.fill;
    delete rest.unoptimized;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

vi.mock("./rich-text-editor", () => ({
  EMPTY_RICH_TEXT_HTML: "<p></p>",
  default: (props: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <textarea
      data-testid="mock-rich-text-editor"
      disabled={props.disabled}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    />
  ),
}));

vi.mock("./sortable-image-grid", () => ({
  default: () => <div data-testid="mock-sortable-image-grid" />,
}));

vi.mock("./audit-history-panel", () => ({
  default: () => <div data-testid="mock-audit-history-panel" />,
}));

vi.mock("./last-updated-meta", () => ({
  default: () => <div data-testid="mock-last-updated-meta" />,
}));

vi.mock("../../../lib/rich-text-content", () => ({
  RichTextContent: (props: { html: string }) => (
    <div data-testid="mock-rich-text-content">{props.html}</div>
  ),
}));

vi.mock("../../../lib/admin-api/resources", () => ({
  adminResourceApi: {
    getGlobalNoticeById: (...args: unknown[]) => getGlobalNoticeById(...args),
    updateGlobalNotice: vi.fn(),
    deleteGlobalNotice: vi.fn(),
    getGenerationNoticeById: vi.fn(),
    updateGenerationNotice: vi.fn(),
    deleteGenerationNotice: vi.fn(),
  },
}));

vi.mock("../../../lib/admin-api/upload", () => ({
  PRESIGN_PATHS: {
    noticeImage: "/notices/presign/image",
  },
  uploadWithPresign: (...args: unknown[]) => uploadWithPresign(...args),
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

const flushEffects = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const createFileList = (files: File[]): FileList => {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* fileIterator() {
      for (const file of files) {
        yield file;
      }
    },
  } as FileList & Record<number, File>;

  for (const [index, file] of files.entries()) {
    fileList[index] = file;
  }

  return fileList;
};

const NOTICE = {
  id: "notice-1",
  title: "공지",
  content: "<p>본문</p>",
  imageUrls: ["https://example.com/notice.jpg"],
  author: {
    id: "author-1",
    name: "작성자",
    image: null,
    role: "manager",
  },
  createdAt: Date.parse("2030-01-01T00:00:00.000Z"),
  updatedAt: Date.parse("2030-01-01T00:00:00.000Z"),
  updatedBy: null,
};

describe("notice image input mode", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    routerReplace.mockReset();
    routerRefresh.mockReset();
    getGlobalNoticeById.mockReset();
    uploadWithPresign.mockReset();
    getGlobalNoticeById.mockResolvedValue(NOTICE);
    uploadWithPresign.mockImplementation(async ({ file }: { file: File }) => {
      return `https://example.com/${file.name}`;
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("공지 작성 폼은 URL 입력 없이 파일 업로드만 노출한다", async () => {
    await act(async () => {
      root.render(
        <NoticeCreateForm
          scope="global"
          canWrite
          basePath="/dashboard/notices"
          listPath="/dashboard/notices"
          heading="전체 공지 작성"
          description="테스트"
        />,
      );
      await flushEffects();
    });

    expect(container.textContent).toContain("파일 업로드");
    expect(container.textContent).not.toContain("URL 추가");
    expect(
      container.querySelector("input[placeholder='https://...']"),
    ).not.toBeInTheDocument();
    const fileInput = container.querySelector(
      "input[type='file']",
    ) as HTMLInputElement | null;
    expect(fileInput).toHaveAttribute("multiple");
  });

  it("공지 수정 폼은 URL 입력 없이 파일 업로드만 노출한다", async () => {
    await act(async () => {
      root.render(
        <NoticeEditForm
          scope="global"
          noticeId="notice-1"
          canWrite
          listPath="/dashboard/notices"
          detailPath="/dashboard/notices/notice-1"
          heading="공지 수정"
          description="테스트"
        />,
      );
      await flushEffects();
    });

    expect(getGlobalNoticeById).toHaveBeenCalledWith("notice-1");
    expect(container.textContent).toContain("파일 업로드");
    expect(container.textContent).not.toContain("URL 추가");
    expect(
      container.querySelector("input[placeholder='https://...']"),
    ).not.toBeInTheDocument();
    const fileInput = container.querySelector(
      "input[type='file']",
    ) as HTMLInputElement | null;
    expect(fileInput).toHaveAttribute("multiple");
  });

  it("공지 상세 바로 수정에서도 URL 입력 없이 파일 업로드만 노출한다", async () => {
    await act(async () => {
      root.render(
        <NoticeDetail
          scope="global"
          noticeId="notice-1"
          canWrite
          listPath="/dashboard/notices"
          heading="공지 상세"
          description="테스트"
          allowInlineEdit
        />,
      );
      await flushEffects();
    });

    const editButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("바로 수정"),
    );
    expect(editButton).toBeTruthy();

    await act(async () => {
      editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushEffects();
    });

    expect(container.textContent).toContain("파일 업로드");
    expect(container.textContent).not.toContain("URL 추가");
    expect(
      container.querySelector("input[placeholder='https://...']"),
    ).not.toBeInTheDocument();
    const fileInput = container.querySelector(
      "input[type='file']",
    ) as HTMLInputElement | null;
    expect(fileInput).toHaveAttribute("multiple");
  });

  it("공지 작성 폼에서 다중 파일 선택 시 선택한 이미지 수만큼 업로드를 요청한다", async () => {
    await act(async () => {
      root.render(
        <NoticeCreateForm
          scope="global"
          canWrite
          basePath="/dashboard/notices"
          listPath="/dashboard/notices"
          heading="전체 공지 작성"
          description="테스트"
        />,
      );
      await flushEffects();
    });

    const fileInput = container.querySelector(
      "input[type='file']",
    ) as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();

    const firstFile = new File(["a"], "first.png", { type: "image/png" });
    const secondFile = new File(["b"], "second.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: createFileList([firstFile, secondFile]),
    });

    await act(async () => {
      fileInput?.dispatchEvent(new Event("change", { bubbles: true }));
      await flushEffects();
    });

    expect(uploadWithPresign).toHaveBeenCalledTimes(2);
    expect(uploadWithPresign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        presignPath: "/notices/presign/image",
        file: firstFile,
      }),
    );
    expect(uploadWithPresign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        presignPath: "/notices/presign/image",
        file: secondFile,
      }),
    );
  });
});
