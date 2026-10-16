import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import PageViewTracker from "@/app/_components/page-view-tracker";

const PAGE_VIEW_PATH = "/api/public/page-views";
const ENGAGEMENT_PATH = "/api/public/page-views/engagement";

describe("PageViewTracker", () => {
  let nowMs = 0;
  // 페이지뷰 응답은 끝내 오지 않는다. 탭을 닫는 순간처럼 응답 전에 문서가 사라지는 경우다.
  const fetchMock = vi.fn((input: RequestInfo | URL) =>
    String(input) === PAGE_VIEW_PATH
      ? new Promise<Response>(() => {})
      : Promise.resolve(new Response(null)),
  );
  const callsTo = (path: string) =>
    fetchMock.mock.calls.filter(([input]) => String(input) === path);

  beforeEach(() => {
    nowMs = 0;
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(performance, "now").mockImplementation(() => nowMs);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // 순서는 서버가 맞춘다(대기 체류 테이블). 응답을 기다리면 탭을 닫을 때 체류가 나가지 못한다.
  it("빠르게 떠나면 페이지뷰 응답을 기다리지 않고 체류 시간을 바로 보낸다", () => {
    const { unmount } = render(<PageViewTracker pageType="home" />);
    expect(callsTo(PAGE_VIEW_PATH)).toHaveLength(1);

    nowMs = 500;
    unmount();

    const [engagement] = callsTo(ENGAGEMENT_PATH);
    expect(engagement).toBeDefined();
    const init = engagement?.[1] as RequestInit | undefined;
    expect(init?.keepalive).toBe(true);
    const pageView = callsTo(PAGE_VIEW_PATH)[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(init?.body))).toEqual({
      pageviewId: JSON.parse(String(pageView?.body)).pageviewId,
      visitorId: JSON.parse(String(pageView?.body)).visitorId,
      engagedMs: 500,
    });
  });
});
