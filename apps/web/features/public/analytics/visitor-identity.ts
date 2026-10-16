/** 업계 표준 세션 경계. 마지막 활동 후 이 시간이 지나면 새 세션이다. */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const VISITOR_KEY = "yy_vid";
const SESSION_KEY = "yy_sess";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const formatUuidV4 = (bytes: Uint8Array): string => {
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * crypto.randomUUID는 iOS 15.4 미만 Safari와 비보안(http) 출처에 없다.
 * 여기서 예외가 나면 트래커가 공개 페이지를 깨뜨리므로 가능한 수단으로 내려간다.
 */
export const createRandomId = (): string => {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return formatUuidV4(bytes);
};
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
  newId: () => string = createRandomId,
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

      const previous = parseSession(read(storage, SESSION_KEY)) ?? memory.session;
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
      const current = parseSession(read(storage, SESSION_KEY)) ?? memory.session;
      // 오래 띄워 둔 페이지를 닫는 시점은 활동이 아니다. 이미 끊긴 세션을 늘리면 다음 페이지가 그 세션을 이어 쓴다.
      if (current === null || nowMs - current.lastActiveAt > SESSION_TIMEOUT_MS) return;
      saveSession({ ...current, lastActiveAt: nowMs });
    },
  };
};
