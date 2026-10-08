import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CHATGPT_FILE_HOST_SUFFIXES,
  downloadChatGptFile,
  isAllowedChatGptFileUrl,
} from "../features/mcp/files/chatgpt-file";
import { McpUploadError } from "../features/mcp/files/mcp-upload-service";
import { pngBytes } from "./mcp-file-fixtures";

const hosts = DEFAULT_CHATGPT_FILE_HOST_SUFFIXES;
const file = {
  download_url: "https://files.oaiusercontent.com/file-abc?sig=1",
  file_id: "file-abc",
  mime_type: "image/png",
  file_name: "사진.png",
};

describe("ChatGPT 파일 주소 검사", () => {
  it.each([
    ["https://files.oaiusercontent.com/file-1", true],
    ["https://sdmntpr.oaiusercontent.com/x", true],
    ["http://files.oaiusercontent.com/file-1", false],
    ["https://evil-oaiusercontent.com/x", false],
    ["https://oaiusercontent.com.evil.test/x", false],
    ["https://127.0.0.1/x", false],
    ["not a url", false],
  ])("%s → %s", (url, expected) => {
    expect(isAllowedChatGptFileUrl(url, hosts)).toBe(expected);
  });
});

describe("ChatGPT 파일 다운로드", () => {
  it("허용 호스트가 아니면 요청하지 않는다", async () => {
    const fetchMock = vi.fn();
    await expect(
      downloadChatGptFile({ ...file, download_url: "https://example.test/a.png" }, {
        fetch: fetchMock,
        hostSuffixes: hosts,
      }),
    ).rejects.toBeInstanceOf(McpUploadError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("리다이렉트를 따라가지 않는다", async () => {
    const fetchMock = vi.fn(async (request: Request) => {
      expect(request.redirect).toBe("manual");
      return new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } });
    });
    await expect(downloadChatGptFile(file, { fetch: fetchMock, hostSuffixes: hosts })).rejects.toThrow(
      "다른 곳으로 이동",
    );
  });

  it("크기를 알 수 없으면 411, 100MB를 넘으면 413이다", async () => {
    const noLength = vi.fn(async () => new Response(pngBytes(1, 1)));
    await expect(downloadChatGptFile(file, { fetch: noLength, hostSuffixes: hosts })).rejects.toMatchObject({
      status: 411,
    });

    const tooLarge = vi.fn(
      async () =>
        new Response(pngBytes(1, 1), { headers: { "content-length": "100000001" } }),
    );
    await expect(downloadChatGptFile(file, { fetch: tooLarge, hostSuffixes: hosts })).rejects.toMatchObject({
      status: 413,
    });
  });

  it("이름·형식·크기·본문을 돌려준다", async () => {
    const bytes = pngBytes(2, 2);
    const fetchMock = vi.fn(
      async () =>
        new Response(bytes, {
          headers: { "content-length": String(bytes.length), "content-type": "application/octet-stream" },
        }),
    );
    const downloaded = await downloadChatGptFile(file, { fetch: fetchMock, hostSuffixes: hosts });
    expect(downloaded).toMatchObject({ fileName: "사진.png", contentType: "image/png", size: bytes.length });
  });
});
