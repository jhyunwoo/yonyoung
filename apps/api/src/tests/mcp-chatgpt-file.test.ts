import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CHATGPT_FILE_HOST_SUFFIXES,
  downloadChatGptFile,
  isAllowedChatGptFileUrl,
} from "../features/mcp/files/chatgpt-file";
import { createMcpFileResolver } from "../features/mcp/files/file-ref";
import { createMemoryMcpObjectStore } from "../features/mcp/files/mcp-object-store";
import { McpUploadError, createMcpUploadService } from "../features/mcp/files/mcp-upload-service";
import { createMemoryMcpUploadStore } from "../features/mcp/files/mcp-upload-store";
import { pngBytes, streamOf } from "./mcp-file-fixtures";
import { IDs, createActor } from "./test-helpers";

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

describe("ChatGPT 파일 다운로드 방어", () => {
  it("파일 이름이 없고 주소의 %가 잘못되면 file_id를 이름으로 쓴다", async () => {
    const bytes = pngBytes(1, 1);
    const fetchMock = vi.fn(
      async () => new Response(bytes, { headers: { "content-length": String(bytes.length) } }),
    );
    const downloaded = await downloadChatGptFile(
      { download_url: "https://files.oaiusercontent.com/%E0%A4%A", file_id: "file-abc" },
      { fetch: fetchMock, hostSuffixes: hosts },
    );
    expect(downloaded.fileName).toBe("file-abc");
  });

  it("리다이렉트 응답의 본문을 닫는다", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const fetchMock = vi.fn(async () => new Response(body, { status: 302 }));
    await expect(downloadChatGptFile(file, { fetch: fetchMock, hostSuffixes: hosts })).rejects.toThrow(
      "다른 곳으로 이동",
    );
    expect(cancelled).toBe(true);
  });
});

describe("파일 참조 해석기", () => {
  const setup = (role: Parameters<typeof createActor>[0] = "manager") => {
    const store = createMemoryMcpUploadStore();
    const createdIds: string[] = [];
    const create = store.create.bind(store);
    store.create = async (record) => {
      createdIds.push(record.id);
      await create(record);
    };
    const objects = createMemoryMcpObjectStore();
    let sequence = 0;
    const uploads = createMcpUploadService({
      store,
      objects,
      presign: {
        allocateManagedObject: async ({ fileName }) => {
          sequence += 1;
          return {
            objectKey: `activities/${sequence}/${fileName}`,
            publicUrl: `https://cdn.example.test/${sequence}/${fileName}`,
          };
        },
      },
      reserveCapacity: async () => ({ id: `res-${sequence}` }),
      settleReservation: async () => undefined,
      releaseReservation: async () => undefined,
      apiOrigin: "https://api.example.test",
      webOrigin: "https://web.example.test",
    });
    const actor = createActor(role, IDs.manager);
    const bytes = pngBytes(2, 2);
    const fetchMock = vi.fn(async (request: Request) => {
      if (request.url.includes("bad")) {
        return new Response(null, { status: 404 });
      }
      return new Response(bytes, { headers: { "content-length": String(bytes.length) } });
    });
    const files = createMcpFileResolver({ actor, uploads, fetch: fetchMock, hostSuffixes: hosts });
    return { store, createdIds, objects, uploads, actor, files, fetchMock, bytes };
  };

  const chatGpt = (name: string) => ({
    download_url: `https://files.oaiusercontent.com/${name}`,
    file_id: name,
    mime_type: "image/png",
    file_name: `${name}.png`,
  });

  const completedUpload = async (ctx: ReturnType<typeof setup>) => {
    const record = await ctx.uploads.ingest(ctx.actor, {
      purpose: "activity_image",
      fileName: "prev.png",
      contentType: "image/png",
      size: ctx.bytes.length,
      body: streamOf(ctx.bytes),
    });
    return record.id;
  };

  it("ChatGPT 파일이 먼저, upload_id가 뒤에 온다", async () => {
    const ctx = setup();
    const uploadId = await completedUpload(ctx);
    const resolved = await ctx.files.resolve({
      purpose: "activity_image",
      chatGptFiles: [chatGpt("one")],
      uploadIds: [uploadId],
    });
    expect(resolved.map((upload) => upload.fileName)).toEqual(["one.png", "prev.png"]);
    expect(resolved.map((upload) => upload.source)).toEqual(["chatgpt", "upload"]);
  });

  it("release는 upload_id를 되돌리고 내려받은 ChatGPT 파일은 버린다", async () => {
    const ctx = setup();
    const uploadId = await completedUpload(ctx);
    const resolved = await ctx.files.resolve({
      purpose: "activity_image",
      chatGptFiles: [chatGpt("one")],
      uploadIds: [uploadId],
    });
    await ctx.files.claim(resolved);
    expect(ctx.objects.objects.size).toBe(2);

    await ctx.files.release(resolved);

    const chatGptId = resolved[0]!.uploadId;
    expect((await ctx.store.getById(chatGptId))?.status).toBe("failed");
    expect((await ctx.store.getById(uploadId))?.status).toBe("completed");
    expect(ctx.objects.objects.size).toBe(1);
  });

  it("잘못된 upload_id면 아무것도 내려받지 않는다", async () => {
    const ctx = setup();
    await expect(
      ctx.files.resolve({
        purpose: "activity_image",
        chatGptFiles: [chatGpt("one")],
        uploadIds: ["missing"],
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(ctx.fetchMock).not.toHaveBeenCalled();
  });

  it("용도 권한이 없으면 아무것도 내려받지 않는다", async () => {
    const ctx = setup("unverified");
    await expect(
      ctx.files.resolve({ purpose: "activity_image", chatGptFiles: [chatGpt("one")] }),
    ).rejects.toMatchObject({ status: 403 });
    expect(ctx.fetchMock).not.toHaveBeenCalled();
  });

  it("두 번째 ChatGPT 파일이 실패하면 첫 번째를 버리고 원래 오류를 던진다", async () => {
    const ctx = setup();
    await expect(
      ctx.files.resolve({
        purpose: "activity_image",
        chatGptFiles: [chatGpt("one"), chatGpt("bad")],
      }),
    ).rejects.toMatchObject({ status: 502 });
    expect(ctx.fetchMock).toHaveBeenCalledTimes(2);
    expect(ctx.createdIds).toHaveLength(1);
    expect((await ctx.store.getById(ctx.createdIds[0]!))?.status).toBe("failed");
    expect(ctx.objects.objects.size).toBe(0);
  });

  it("같은 upload_id가 두 번 들어오면 내려받기 전에 거절하고 업로드를 그대로 둔다", async () => {
    const ctx = setup();
    const uploadId = await completedUpload(ctx);
    await expect(
      ctx.files.resolve({
        purpose: "activity_image",
        chatGptFiles: [chatGpt("one")],
        uploadIds: [uploadId, uploadId],
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(ctx.fetchMock).not.toHaveBeenCalled();
    expect((await ctx.store.getById(uploadId))?.status).toBe("completed");
  });

  it("버리는 중에 오류가 나도 원래 오류를 던진다", async () => {
    const ctx = setup();
    ctx.store.discard = async () => {
      throw new Error("D1_ERROR: discard failed");
    };
    await expect(
      ctx.files.resolve({
        purpose: "activity_image",
        chatGptFiles: [chatGpt("one"), chatGpt("bad")],
      }),
    ).rejects.toMatchObject({ status: 502 });
  });
});

describe("업로드 저장 실패 정리", () => {
  it("기록을 실패로 바꾸지 못해도 객체와 예약을 정리하고 원래 오류를 던진다", async () => {
    const store = createMemoryMcpUploadStore();
    store.fail = async () => {
      throw new Error("D1_ERROR: fail failed");
    };
    const objects = createMemoryMcpObjectStore();
    const releaseReservation = vi.fn(async () => undefined);
    const uploads = createMcpUploadService({
      store,
      objects,
      presign: {
        allocateManagedObject: async ({ fileName }) => ({
          objectKey: `activities/1/${fileName}`,
          publicUrl: `https://cdn.example.test/1/${fileName}`,
        }),
      },
      reserveCapacity: async () => ({ id: "res-1" }),
      settleReservation: async () => undefined,
      releaseReservation,
      apiOrigin: "https://api.example.test",
      webOrigin: "https://web.example.test",
    });
    const bytes = pngBytes(2, 2);

    await expect(
      uploads.ingest(createActor("manager", IDs.manager), {
        purpose: "activity_image",
        fileName: "짧음.png",
        contentType: "image/png",
        size: bytes.length + 1,
        body: streamOf(bytes),
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(objects.objects.size).toBe(0);
    expect(releaseReservation).toHaveBeenCalledWith("res-1");
  });
});
