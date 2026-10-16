import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import PageViewTracker from "@/app/_components/page-view-tracker";

const PAGE_VIEW_PATH = "/api/public/page-views";
const ENGAGEMENT_PATH = "/api/public/page-views/engagement";

describe("PageViewTracker", () => {
  let nowMs = 0;
  let finishPageView: () => void = () => {};
  const fetchMock = vi.fn((input: RequestInfo | URL) =>
    String(input) === PAGE_VIEW_PATH
      ? new Promise<Response>((resolve) => {
          finishPageView = () => resolve(new Response(null));
        })
      : Promise.resolve(new Response(null)),
  );
  const requestedPaths = () => fetchMock.mock.calls.map(([input]) => String(input));

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

  // 체류 갱신은 기존 행만 고치므로 페이지뷰 행보다 먼저 도착하면 사라진다.
  it("빠르게 떠나도 페이지뷰 기록이 끝난 뒤에 체류 시간을 보낸다", async () => {
    const { unmount } = render(<PageViewTracker pageType="home" />);
    expect(requestedPaths()).toContain(PAGE_VIEW_PATH);

    nowMs = 500;
    unmount();
    await Promise.resolve();
    expect(requestedPaths()).not.toContain(ENGAGEMENT_PATH);

    finishPageView();
    await waitFor(() => expect(requestedPaths()).toContain(ENGAGEMENT_PATH));
    const engagementCall = fetchMock.mock.calls.find(
      ([input]) => String(input) === ENGAGEMENT_PATH,
    );
    const init = engagementCall?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(init?.body))).toMatchObject({ engagedMs: 500 });
  });
});
