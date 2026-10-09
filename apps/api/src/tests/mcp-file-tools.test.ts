import { describe, expect, it, vi } from "vitest";
import { MCP_TOOL_CATALOG } from "@yonyoung/contracts/mcp";
import { IMAGE_BATCH_MAX_ITEMS } from "@yonyoung/contracts/common";
import { runWithFiles } from "../features/mcp/files/file-tool";
import { createMemoryMcpObjectStore } from "../features/mcp/files/mcp-object-store";
import type { ResolvedUpload } from "../features/mcp/files/mcp-upload-service";
import { createMemoryMcpUploadStore } from "../features/mcp/files/mcp-upload-store";
import type { McpToolContext } from "../features/mcp/tool-definition";
import { MCP_TOOL_DEFINITIONS } from "../features/mcp/tools";
import { pdfBytes, pngBytes } from "./mcp-file-fixtures";
import {
  connectMcpClient,
  createMcpTestApp,
  resultText,
  uploadViaClaudePath,
} from "./mcp-test-harness";
import {
  IDs,
  MANAGED_FILE_TEST_ENV,
  buildManagedFileUrl,
  createActivity,
  createActor,
  createAttachment,
  createDataServiceMock,
  createExhibition,
  createPresignServiceMock,
  createUser,
} from "./test-helpers";

describe("카탈로그 ↔ 정의", () => {
  it("모든 카탈로그 도구가 정의되어 있고 그 반대도 같다", () => {
    expect([...MCP_TOOL_DEFINITIONS.keys()].sort()).toEqual(
      MCP_TOOL_CATALOG.map((tool) => tool.name).sort(),
    );
  });

  it("파일 도구에는 openai/fileParams가 붙는다", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({ getActor: () => createActor("president", IDs.president) }),
    );
    const { tools } = await client.listTools();
    const imagesAdd = tools.find((tool) => tool.name === "activity_images_add");
    expect(imagesAdd?._meta?.["openai/fileParams"]).toEqual(["files"]);
  });
});

describe("activity_images_add", () => {
  it("Claude 업로드를 세부 이미지로 추가하고 다시 쓰지 못하게 한다", async () => {
    const addActivityImages = vi.fn(async () => []);
    const uploadStore = createMemoryMcpUploadStore();
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      uploadStore,
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity({ detailImages: [] }),
        addActivityImages,
      }),
    });
    const client = await connectMcpClient(app);
    const first = await uploadViaClaudePath(app, client, {
      purpose: "activity_image",
      fileName: "a.png",
      contentType: "image/png",
      bytes: pngBytes(640, 480),
    });

    const result = await client.callTool({
      name: "activity_images_add",
      arguments: { id: IDs.activity, upload_ids: [first] },
    });

    expect(result.isError).toBeFalsy();
    expect(addActivityImages).toHaveBeenCalledWith(
      IDs.activity,
      [expect.objectContaining({ sortOrder: 0, width: 640, height: 480 })],
    );
    expect((await uploadStore.getById(first))?.status).toBe("consumed");

    const again = await client.callTool({
      name: "activity_images_add",
      arguments: { id: IDs.activity, upload_ids: [first] },
    });
    expect(again.isError).toBe(true);
    expect(resultText(again)).toContain("이미 사용한 업로드");
  });

  it("라우트가 실패하면 업로드를 되돌려 다시 쓸 수 있다", async () => {
    const uploadStore = createMemoryMcpUploadStore();
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      uploadStore,
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity({ detailImages: [] }),
        addActivityImages: async () => {
          throw new Error("D1 down");
        },
      }),
    });
    const client = await connectMcpClient(app);
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "activity_image",
      fileName: "a.png",
      contentType: "image/png",
      bytes: pngBytes(1, 1),
    });

    const result = await client.callTool({
      name: "activity_images_add",
      arguments: { id: IDs.activity, upload_ids: [uploadId] },
    });
    expect(result.isError).toBe(true);
    expect((await uploadStore.getById(uploadId))?.status).toBe("completed");
  });

  it("올린 지 하루가 지난 업로드는 받지 않는다", async () => {
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity({ detailImages: [] }),
      }),
    });
    const client = await connectMcpClient(app);
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "activity_image",
      fileName: "a.png",
      contentType: "image/png",
      bytes: pngBytes(1, 1),
    });

    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000 + 1);
      const result = await client.callTool({
        name: "activity_images_add",
        arguments: { id: IDs.activity, upload_ids: [uploadId] },
      });
      expect(result.isError).toBe(true);
      expect(resultText(result)).toContain(
        "업로드한 지 오래되어 사용할 수 없습니다. 다시 올려 주세요.",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("다른 용도로 준비한 업로드는 받지 않는다", async () => {
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        getExhibitionById: async () => createExhibition({ detailImages: [] }),
      }),
    });
    const client = await connectMcpClient(app);
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "activity_image",
      fileName: "a.png",
      contentType: "image/png",
      bytes: pngBytes(1, 1),
    });

    const result = await client.callTool({
      name: "exhibition_images_add",
      arguments: { id: IDs.exhibition, upload_ids: [uploadId] },
    });
    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain("activity_image 용도로 준비한 업로드");
  });

  it("ChatGPT 파일을 내려받아 추가한다", async () => {
    const bytes = pngBytes(3, 2);
    const addActivityImages = vi.fn(async () => []);
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity({ detailImages: [] }),
        addActivityImages,
      }),
      overrides: {
        fetchChatGptFile: async () =>
          new Response(bytes, { headers: { "content-length": String(bytes.length) } }),
      },
    });
    const client = await connectMcpClient(app);

    const result = await client.callTool({
      name: "activity_images_add",
      arguments: {
        id: IDs.activity,
        files: [
          {
            download_url: "https://files.oaiusercontent.com/file-1",
            file_id: "file-1",
            mime_type: "image/png",
            file_name: "a.png",
          },
        ],
      },
    });

    expect(result.isError).toBeFalsy();
    expect(addActivityImages).toHaveBeenCalledWith(
      IDs.activity,
      [expect.objectContaining({ width: 3, height: 2 })],
    );
  });
});

describe("my_profile_photo_set", () => {
  it("올린 이미지를 프로필 사진으로 바꾼다", async () => {
    const updateUser = vi.fn(async () => createUser({ id: IDs.member }));
    const app = createMcpTestApp({
      getActor: () => createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        getUserById: async () => createUser({ id: IDs.member }),
        updateUser,
      }),
    });
    const client = await connectMcpClient(app);
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "profile_image",
      fileName: "me.png",
      contentType: "image/png",
      bytes: pngBytes(10, 10),
    });

    const result = await client.callTool({
      name: "my_profile_photo_set",
      arguments: { upload_id: uploadId },
    });
    expect(result.isError).toBeFalsy();
    expect(updateUser).toHaveBeenCalledWith(
      IDs.member,
      expect.objectContaining({ image: expect.stringContaining("users/") }),
    );
  });
});

describe("attachment_create", () => {
  it("문서를 활동 자료로 등록한다", async () => {
    const addAttachment = vi.fn(async () => createAttachment({ scope: "activity", resourceId: IDs.activity }));
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      presignService: createPresignServiceMock({
        allocateManagedObject: async () => {
          const publicUrl = buildManagedFileUrl("activities", IDs.manager);
          return { objectKey: decodeURIComponent(new URL(publicUrl).pathname.replace("/api/public/media/", "")), publicUrl };
        },
      }),
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity(),
        addAttachment,
      }),
    });
    const client = await connectMcpClient(app, { env: MANAGED_FILE_TEST_ENV });
    const uploadId = await uploadViaClaudePath(app, client, {
      purpose: "activity_file",
      fileName: "정산.pdf",
      contentType: "application/pdf",
      bytes: pdfBytes(),
    });

    const result = await client.callTool({
      name: "attachment_create",
      arguments: {
        data: { scope: "activity", resourceId: IDs.activity, title: "봄 출사 정산" },
        upload_id: uploadId,
      },
    });

    expect(result.isError, resultText(result)).toBeFalsy();
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "정산.pdf", mimeType: "application/pdf" }),
    );
  });
});

const chatGptFile = (name: string) => ({
  download_url: `https://files.oaiusercontent.com/${name}`,
  file_id: name,
  mime_type: "image/png",
  file_name: `${name}.png`,
});

describe("인자만으로 정해지는 검사는 내려받기 전에 한다", () => {
  const activityData = {
    title: "봄 출사",
    description: "<p>출사</p>",
    startDate: 1735689600000,
    endDate: 1738368000000,
    generationId: IDs.generation,
  };
  const exhibitionData = { ...activityData, place: "아트홀" };
  const bothCovers = { cover_file: chatGptFile("cover"), cover_upload_id: "upload-1" };
  const manyFiles = {
    files: Array.from({ length: 300 }, (_, index) => chatGptFile(`f${index}`)),
    upload_ids: Array.from({ length: IMAGE_BATCH_MAX_ITEMS - 299 }, (_, index) => `u${index}`),
  };

  it.each([
    ["my_profile_photo_set", { file: chatGptFile("me"), upload_id: "upload-1" }, "이미지 하나를"],
    ["my_profile_photo_set", {}, "이미지 하나를"],
    ["activity_create", { data: activityData, ...bothCovers }, "커버 이미지는 하나만"],
    ["activity_update", { id: IDs.activity, data: {}, ...bothCovers }, "커버 이미지는 하나만"],
    ["exhibition_create", { data: exhibitionData, ...bothCovers }, "커버 이미지는 하나만"],
    ["exhibition_update", { id: IDs.exhibition, data: {}, ...bothCovers }, "커버 이미지는 하나만"],
    [
      "attachment_create",
      {
        data: { scope: "activity", resourceId: IDs.activity, title: "정산" },
        file: chatGptFile("doc"),
        upload_id: "upload-1",
      },
      "자료 파일은 하나만",
    ],
    [
      "attachment_create",
      {
        data: {
          scope: "activity",
          resourceId: IDs.activity,
          title: "정산",
          linkUrl: "https://docs.google.com/x",
        },
        file: chatGptFile("doc"),
      },
      "파일과 linkUrl 중 하나만",
    ],
    [
      "recruiting_plan_upsert",
      {
        data: {
          title: "모집",
          content: "<p>모집</p>",
          promotionImageUrls: Array.from(
            { length: 9 },
            (_, index) => `https://cdn.example.test/recruiting/${index}.png`,
          ),
          recruitmentStartAt: 1735689600000,
          recruitmentEndAt: 1738368000000,
        },
        promotion_files: [chatGptFile("p1"), chatGptFile("p2")],
      },
      "홍보 이미지는 최대 10장",
    ],
    ["activity_images_add", { id: IDs.activity, ...manyFiles }, `최대 ${IMAGE_BATCH_MAX_ITEMS}장`],
    ["exhibition_images_add", { id: IDs.exhibition, ...manyFiles }, `최대 ${IMAGE_BATCH_MAX_ITEMS}장`],
    ["activity_images_add", { id: IDs.activity }, "추가할 사진을"],
  ])("%s 인자 검사 #%#", async (name, args, message) => {
    const fetchChatGptFile = vi.fn();
    const app = createMcpTestApp({
      getActor: () => createActor("president", IDs.president),
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity({ detailImages: [] }),
        getExhibitionById: async () => createExhibition({ detailImages: [] }),
      }),
      overrides: { fetchChatGptFile },
    });
    const client = await connectMcpClient(app);

    const result = await client.callTool({ name, arguments: args });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain(message);
    expect(fetchChatGptFile).not.toHaveBeenCalled();
  });
});

describe("라우트가 실패했을 때 ChatGPT 파일", () => {
  it("기록을 failed로 바꾸고 저장한 객체를 지운다", async () => {
    const bytes = pngBytes(2, 2);
    const uploadStore = createMemoryMcpUploadStore();
    const objectStore = createMemoryMcpObjectStore();
    const createdIds: string[] = [];
    const create = uploadStore.create.bind(uploadStore);
    uploadStore.create = async (record) => {
      createdIds.push(record.id);
      await create(record);
    };
    const app = createMcpTestApp({
      getActor: () => createActor("manager", IDs.manager),
      uploadStore,
      objectStore,
      dataService: createDataServiceMock({
        getActivityById: async () => createActivity({ detailImages: [] }),
        addActivityImages: async () => {
          throw new Error("D1 down");
        },
      }),
      overrides: {
        fetchChatGptFile: async () =>
          new Response(bytes, { headers: { "content-length": String(bytes.length) } }),
      },
    });
    const client = await connectMcpClient(app);

    const result = await client.callTool({
      name: "activity_images_add",
      arguments: { id: IDs.activity, files: [chatGptFile("a")] },
    });

    expect(result.isError).toBe(true);
    expect(createdIds).toHaveLength(1);
    expect((await uploadStore.getById(createdIds[0]!))?.status).toBe("failed");
    expect(objectStore.objects.size).toBe(0);
  });
});

describe("runWithFiles", () => {
  it("라우트 호출이 던지면 업로드를 되돌리고 오류를 다시 던진다", async () => {
    const files = [{ uploadId: "up-1" } as ResolvedUpload];
    const claim = vi.fn(async () => undefined);
    const release = vi.fn(async () => undefined);
    const context = {
      actor: createActor("manager", IDs.manager),
      api: {
        call: async () => {
          throw new Error("dispatch failed");
        },
      },
      files: { resolve: vi.fn(), claim, release },
    } as unknown as McpToolContext;

    await expect(
      runWithFiles(context, files, { method: "POST", path: "/api/x" }, "완료"),
    ).rejects.toThrow("dispatch failed");
    expect(claim).toHaveBeenCalledWith(files);
    expect(release).toHaveBeenCalledWith(files);
  });
});
