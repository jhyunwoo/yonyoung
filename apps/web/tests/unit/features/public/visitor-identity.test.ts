import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SESSION_TIMEOUT_MS,
  createRandomId,
  createVisitIdentity,
} from "@/features/public/analytics/visitor-identity";

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
};

const sequentialIds = () => {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
};

describe("createVisitIdentity", () => {
  it("첫 방문에 방문자와 세션을 만들고 세션 시작으로 표시한다", () => {
    const identity = createVisitIdentity(memoryStorage(), sequentialIds());
    const visit = identity.resolve(1_000);
    expect(visit).toEqual({
      visitorId: "00000000-0000-4000-8000-000000000001",
      sessionId: "00000000-0000-4000-8000-000000000002",
      sessionStart: true,
    });
  });

  it("30분 안의 다음 페이지뷰는 같은 세션이다", () => {
    const storage = memoryStorage();
    const identity = createVisitIdentity(storage, sequentialIds());
    const first = identity.resolve(0);
    const second = identity.resolve(SESSION_TIMEOUT_MS);
    expect(second).toEqual({ ...first, sessionStart: false });
  });

  it("30분이 넘게 쉬면 같은 방문자의 새 세션이다", () => {
    const identity = createVisitIdentity(memoryStorage(), sequentialIds());
    const first = identity.resolve(0);
    const second = identity.resolve(SESSION_TIMEOUT_MS + 1);
    expect(second.visitorId).toBe(first.visitorId);
    expect(second.sessionId).not.toBe(first.sessionId);
    expect(second.sessionStart).toBe(true);
  });

  it("touch는 세션 만료 시점을 늦춘다", () => {
    const identity = createVisitIdentity(memoryStorage(), sequentialIds());
    const first = identity.resolve(0);
    identity.touch(SESSION_TIMEOUT_MS);
    const second = identity.resolve(SESSION_TIMEOUT_MS * 2);
    expect(second.sessionId).toBe(first.sessionId);
  });

  it("다른 탭(같은 저장소)도 같은 방문자·세션을 본다", () => {
    const storage = memoryStorage();
    const ids = sequentialIds();
    const first = createVisitIdentity(storage, ids).resolve(0);
    const otherTab = createVisitIdentity(storage, ids).resolve(1_000);
    expect(otherTab).toEqual({ ...first, sessionStart: false });
  });

  it("저장소가 예외를 던져도 메모리 ID로 계속 동작한다", () => {
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const identity = createVisitIdentity(throwing, sequentialIds());
    const first = identity.resolve(0);
    const second = identity.resolve(1_000);
    expect(second).toEqual({ ...first, sessionStart: false });
  });

  it("손상된 저장값은 버리고 새로 만든다", () => {
    const storage = memoryStorage();
    storage.setItem("yy_vid", "not-a-uuid");
    storage.setItem("yy_sess", "{broken");
    const visit = createVisitIdentity(storage, sequentialIds()).resolve(0);
    expect(visit.visitorId).toBe("00000000-0000-4000-8000-000000000001");
    expect(visit.sessionStart).toBe(true);
  });
});

describe("createRandomId", () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("randomUUID가 없는 브라우저에서도 UUID v4를 만든다", () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal("crypto", { getRandomValues });
    expect(createRandomId()).toMatch(UUID_V4);
    expect(createVisitIdentity(null).resolve(0).visitorId).toMatch(UUID_V4);
  });

  it("crypto가 아예 없어도 예외 없이 UUID 형식을 돌려준다", () => {
    vi.stubGlobal("crypto", undefined);
    expect(createRandomId()).toMatch(UUID_V4);
  });
});
