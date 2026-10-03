import type * as HonoClientModule from "@/server/http/hono-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const headersMock = vi.hoisted(() => vi.fn());
const updateTagMock = vi.hoisted(() => vi.fn());
const requireSessionMock = vi.hoisted(() => vi.fn());
const honoRequestMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: headersMock,
  cookies: vi.fn(async () => ({ getAll: () => [] })),
}));

vi.mock("next/cache", () => ({
  updateTag: updateTagMock,
}));

vi.mock("@/features/auth/server/auth-guard", () => ({
  serverAuthGuard: {
    requireSession: requireSessionMock,
  },
}));

vi.mock("@/features/dashboard/actions/admin-write-access", () => ({
  assertAdminWriteAccess: vi.fn(),
}));

vi.mock("@/server/http/hono-client", async (importOriginal) => {
  const actual = await importOriginal<typeof HonoClientModule>();
  return {
    ...actual,
    honoRequest: honoRequestMock,
  };
});

import { writeRequest } from "@/features/dashboard/actions/admin-write-core";
import {
  describeValidationIssue,
  parseActionInput,
} from "@/features/dashboard/actions/action-input";
import { HonoApiError, INVALID_RESPONSE_CODE } from "@/server/http/hono-client";
import { createActivityAction } from "@/features/dashboard/actions/activities";
import { createAttachmentAction } from "@/features/dashboard/actions/attachments";

describe("parseActionInput", () => {
  it("검증 실패를 던지지 않고 400 VALIDATION_ERROR 결과로 돌려준다", () => {
    const result = parseActionInput(z.object({ title: z.string().max(3) }), {
      title: "너무 긴 제목",
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      requestId: null,
      errorMessage: "'title' 항목은 최대 3자까지 입력할 수 있습니다.",
    });
  });

  it("성공하면 파싱된 값을 돌려준다", () => {
    expect(parseActionInput(z.object({ n: z.coerce.number() }), { n: "3" })).toEqual({
      ok: true,
      data: { n: 3 },
    });
  });

  it("알 수 없는 이슈도 한국어 문장으로 바꾼다", () => {
    expect(describeValidationIssue(undefined)).toBe("입력값 형식을 확인해 주세요.");
    const email = z.object({ email: z.email() }).safeParse({ email: "x" });
    expect(describeValidationIssue(email.error?.issues[0])).toBe(
      "'email' 항목의 형식이 올바르지 않습니다.",
    );
  });
});

describe("writeRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionMock.mockResolvedValue({ user: { id: "u1", role: "president" } });
    headersMock.mockResolvedValue({ get: () => null });
  });

  it("성공하면 태그를 무효화한다", async () => {
    honoRequestMock.mockResolvedValue({ id: "a1" });

    const result = await writeRequest({
      path: "/activities",
      method: "POST",
      body: {},
      responseSchema: z.object({ id: z.string() }),
      tags: ["public:activities"],
    });

    expect(result).toEqual({ ok: true, data: { id: "a1" } });
    expect(updateTagMock).toHaveBeenCalledWith("public:activities");
  });

  it("2xx였지만 응답을 해석하지 못해도 캐시는 무효화하고 실패를 알린다", async () => {
    honoRequestMock.mockRejectedValue(
      new HonoApiError({
        status: 502,
        code: INVALID_RESPONSE_CODE,
        message: "해석 실패",
      }),
    );

    const result = await writeRequest({
      path: "/activities",
      method: "POST",
      body: {},
      responseSchema: z.object({ id: z.string() }),
      tags: ["public:activities"],
    });

    expect(result).toMatchObject({ ok: false, code: INVALID_RESPONSE_CODE, status: 502 });
    expect(updateTagMock).toHaveBeenCalledWith("public:activities");
  });

  it("API 오류면 캐시를 건드리지 않는다", async () => {
    honoRequestMock.mockRejectedValue(
      new HonoApiError({ status: 409, code: "CONFLICT", message: "충돌" }),
    );

    const result = await writeRequest({
      path: "/activities",
      method: "POST",
      body: {},
      responseSchema: z.object({ id: z.string() }),
      tags: ["public:activities"],
    });

    expect(result).toMatchObject({ ok: false, status: 409, errorMessage: "충돌" });
    expect(updateTagMock).not.toHaveBeenCalled();
  });
});

describe("도메인 액션 입력 검증", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("활동 입력이 계약을 어기면 API를 호출하지 않고 실패 결과를 돌려준다", async () => {
    const result = await createActivityAction({
      title: "",
    } as never);

    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR", status: 400 });
    expect(honoRequestMock).not.toHaveBeenCalled();
  });

  it("200자를 넘는 첨부 제목도 예외 대신 실패 결과가 된다", async () => {
    const result = await createAttachmentAction({
      scope: "site_donate",
      resourceId: null,
      title: "가".repeat(201),
      linkUrl: "https://example.com",
    });

    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(honoRequestMock).not.toHaveBeenCalled();
  });
});
