import { afterEach, describe, expect, it, vi } from "vitest";

const getProxyClientIpSecret = vi.hoisted(() => vi.fn<() => string | undefined>());
vi.mock("@/server/env", () => ({ getProxyClientIpSecret }));

import {
  freshPublicReadHeaders,
  toFreshPublicReadPath,
} from "@/server/http/fresh-public-read";

afterEach(() => vi.clearAllMocks());

describe("toFreshPublicReadPath", () => {
  it("쿼리가 없으면 ?fresh=1, 있으면 &fresh=1을 붙인다", () => {
    expect(toFreshPublicReadPath("/api/public/activities")).toBe(
      "/api/public/activities?fresh=1",
    );
    expect(toFreshPublicReadPath("/api/public/attachments?scope=site_donate")).toBe(
      "/api/public/attachments?scope=site_donate&fresh=1",
    );
  });
});

// API는 공유 비밀이 설정돼 있으면 비밀을 보낸 요청의 fresh=1만 받아 준다.
describe("freshPublicReadHeaders", () => {
  it("공유 비밀이 있으면 함께 보낸다", () => {
    getProxyClientIpSecret.mockReturnValue("shared-secret-for-client-ip");
    expect(freshPublicReadHeaders()).toEqual({
      "x-yonyoung-proxy-auth": "shared-secret-for-client-ip",
    });
  });

  it("공유 비밀이 없으면 아무것도 보내지 않는다", () => {
    getProxyClientIpSecret.mockReturnValue(undefined);
    expect(freshPublicReadHeaders()).toEqual({});
  });
});
