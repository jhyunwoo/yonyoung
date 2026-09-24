import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import SessionKeepAlive from "@/app/(dashboard)/_components/session-keep-alive";

const KEY = "yonyoung:session-refreshed-at";
const HOUR = 60 * 60 * 1000;

describe("SessionKeepAlive", () => {
  const fetchMock = vi.fn(async () => new Response("null", { status: 200 }));

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("처음 본 브라우저는 시각만 기록하고 세션 요청을 보내지 않는다", () => {
    render(<SessionKeepAlive />);

    expect(window.localStorage.getItem(KEY)).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("마지막 갱신 후 12시간이 지나지 않았으면 요청하지 않는다", () => {
    window.localStorage.setItem(KEY, String(Date.now() - 2 * HOUR));

    render(<SessionKeepAlive />);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("12시간이 지났으면 인증 프록시로 세션을 조회해 갱신 쿠키를 받는다", () => {
    window.localStorage.setItem(KEY, String(Date.now() - 13 * HOUR));

    render(<SessionKeepAlive />);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/get-session",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(Number(window.localStorage.getItem(KEY))).toBeGreaterThan(Date.now() - HOUR);
  });
});
