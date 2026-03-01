import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type ServiceWorkerHandlers = {
  push?: (event: {
    data?: {
      json: () => unknown;
    };
    waitUntil: (promise: Promise<unknown>) => void;
  }) => void;
  notificationclick?: (event: {
    notification: {
      close: () => void;
      data?: { url?: string };
    };
    waitUntil: (promise: Promise<unknown>) => void;
  }) => void;
};

const loadMarketServiceWorker = () => {
  const source = readFileSync(
    resolve(process.cwd(), "public/market-sw.js"),
    "utf8",
  );

  const handlers: ServiceWorkerHandlers = {};
  const showNotificationMock = vi.fn(async () => undefined);
  const matchAllMock = vi.fn(async () => []);
  const openWindowMock = vi.fn(async () => undefined);

  const scope = {
    location: {
      origin: "https://yonyoung.moveto.kr",
    },
    registration: {
      showNotification: showNotificationMock,
    },
    clients: {
      matchAll: matchAllMock,
      openWindow: openWindowMock,
    },
    addEventListener: (type: string, handler: unknown) => {
      if (type === "push") {
        handlers.push = handler as ServiceWorkerHandlers["push"];
      }
      if (type === "notificationclick") {
        handlers.notificationclick =
          handler as ServiceWorkerHandlers["notificationclick"];
      }
    },
  };

  runInNewContext(source, { self: scope, URL });

  return {
    handlers,
    showNotificationMock,
    matchAllMock,
    openWindowMock,
  };
};

describe("market service worker", () => {
  it("push 이벤트 수신 시 일반 브라우저 알림을 표시한다", async () => {
    const { handlers, showNotificationMock } = loadMarketServiceWorker();

    const waitUntilList: Promise<unknown>[] = [];
    handlers.push?.({
      data: {
        json: () => ({
          title: "연영장터 새 댓글",
          body: "새 댓글이 등록되었습니다.",
          url: "/dashboard/market",
        }),
      },
      waitUntil: (promise) => waitUntilList.push(promise),
    });

    await Promise.all(waitUntilList);

    expect(showNotificationMock).toHaveBeenCalledWith("연영장터 새 댓글", {
      body: "새 댓글이 등록되었습니다.",
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
      tag: "market-comment",
      data: {
        url: "https://yonyoung.moveto.kr/dashboard/market",
      },
    });
  });

  it("notificationclick 이벤트에서 장터 페이지로 이동한다", async () => {
    const { handlers, matchAllMock, openWindowMock } = loadMarketServiceWorker();
    const closeMock = vi.fn();

    matchAllMock.mockResolvedValueOnce([]);

    const waitUntilList: Promise<unknown>[] = [];
    handlers.notificationclick?.({
      notification: {
        close: closeMock,
        data: {
          url: "/dashboard/market",
        },
      },
      waitUntil: (promise) => waitUntilList.push(promise),
    });

    await Promise.all(waitUntilList);

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(matchAllMock).toHaveBeenCalledWith({
      type: "window",
      includeUncontrolled: true,
    });
    expect(openWindowMock).toHaveBeenCalledWith(
      "https://yonyoung.moveto.kr/dashboard/market",
    );
  });
});
