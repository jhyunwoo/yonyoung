/** 업계 표준 세션 경계. 마지막 활동 후 이 시간이 지나면 새 세션이다. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const VISITOR_KEY = "yy_vid";
const SESSION_KEY = "yy_sess";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type StoredSession = { id: string; lastActiveAt: number };

export type VisitContext = {
  visitorId: string;
  sessionId: string;
  sessionStart: boolean;
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

// 프라이빗 모드나 저장소 차단에서는 접근 자체가 예외를 던진다. 그때는 메모리 값으로 이어 간다.
const read = (storage: StorageLike | null, key: string): string | null => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const write = (storage: StorageLike | null, key: string, value: string) => {
  try {
    storage?.setItem(key, value);
  } catch {
    // 메모리 값이 남아 있으므로 이 문서 안에서는 계속 같은 ID를 쓴다.
  }
};

const parseSession = (raw: string | null): StoredSession | null => {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      "lastActiveAt" in value &&
      isUuid(value.id) &&
      typeof value.lastActiveAt === "number"
    ) {
      return { id: value.id, lastActiveAt: value.lastActiveAt };
    }
  } catch {
    // 손상된 값은 새 세션으로 덮어쓴다.
  }
  return null;
};

export const createVisitIdentity = (
  storage: StorageLike | null,
  newId: () => string = () => crypto.randomUUID(),
) => {
  const memory: { visitorId: string | null; session: StoredSession | null } = {
    visitorId: null,
    session: null,
  };

  const saveSession = (session: StoredSession) => {
    memory.session = session;
    write(storage, SESSION_KEY, JSON.stringify(session));
  };

  return {
    resolve(nowMs: number): VisitContext {
      const storedVisitor = read(storage, VISITOR_KEY);
      const visitorId = isUuid(storedVisitor)
        ? storedVisitor
        : (memory.visitorId ?? newId());
      memory.visitorId = visitorId;
      write(storage, VISITOR_KEY, visitorId);

      const previous =
        parseSession(read(storage, SESSION_KEY)) ?? memory.session;
      const sessionStart =
        previous === null || nowMs - previous.lastActiveAt > SESSION_TIMEOUT_MS;
      const session = {
        id: sessionStart || previous === null ? newId() : previous.id,
        lastActiveAt: nowMs,
      };
      saveSession(session);
      return { visitorId, sessionId: session.id, sessionStart };
    },

    touch(nowMs: number) {
      const current =
        parseSession(read(storage, SESSION_KEY)) ?? memory.session;
      if (current !== null) saveSession({ ...current, lastActiveAt: nowMs });
    },
  };
};
