export type McpConnection = {
  clientId: string;
  clientName: string | null;
  clientUri: string | null;
  scopes: string[];
  connectedAt: number;
  updatedAt: number;
};

export interface McpConnectionStore {
  hasConsent(userId: string, clientId: string): Promise<boolean>;
  list(userId: string): Promise<McpConnection[]>;
  /** 동의를 지우고 그 클라이언트의 토큰을 폐기한다. 지운 동의가 있었으면 true. */
  revoke(userId: string, clientId: string, now: number): Promise<boolean>;
  getClient(clientId: string): Promise<{
    clientId: string;
    name: string | null;
    uri: string | null;
  } | null>;
}

type ConnectionDatabase = Pick<D1Database, "prepare" | "batch">;

type ConnectionRow = {
  client_id: string;
  name: string | null;
  uri: string | null;
  scopes: string | null;
  created_at: number | null;
  updated_at: number | null;
};

const parseScopes = (value: string | null): string[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

/**
 * Better Auth oauth-provider 테이블을 직접 읽고 쓴다. delete-consent 엔드포인트는
 * 리프레시 토큰을 남기므로 연결 해제는 여기서 동의 삭제와 토큰 폐기를 한 batch로 처리한다.
 */
export const createD1McpConnectionStore = (
  database: ConnectionDatabase,
): McpConnectionStore => ({
  async hasConsent(userId, clientId) {
    const row = await database
      .prepare(
        "SELECT 1 AS found FROM oauth_consent WHERE user_id = ? AND client_id = ? LIMIT 1",
      )
      .bind(userId, clientId)
      .first<{ found: number }>();
    return row !== null;
  },

  async list(userId) {
    const result = await database
      .prepare(
        `
        SELECT c.client_id, oc.name, oc.uri, c.scopes, c.created_at, c.updated_at
        FROM oauth_consent c
        LEFT JOIN oauth_client oc ON oc.client_id = c.client_id
        WHERE c.user_id = ?
        ORDER BY c.updated_at DESC
        `,
      )
      .bind(userId)
      .all<ConnectionRow>();
    return result.results.map((row) => ({
      clientId: row.client_id,
      clientName: row.name,
      clientUri: row.uri,
      scopes: parseScopes(row.scopes),
      connectedAt: Number(row.created_at ?? 0),
      updatedAt: Number(row.updated_at ?? row.created_at ?? 0),
    }));
  },

  async revoke(userId, clientId, now) {
    const [deleted] = await database.batch([
      database
        .prepare(
          "DELETE FROM oauth_consent WHERE user_id = ? AND client_id = ?",
        )
        .bind(userId, clientId),
      database
        .prepare(
          "UPDATE oauth_refresh_token SET revoked = ? WHERE user_id = ? AND client_id = ? AND revoked IS NULL",
        )
        .bind(now, userId, clientId),
      database
        .prepare(
          "UPDATE oauth_access_token SET revoked = ? WHERE user_id = ? AND client_id = ? AND revoked IS NULL",
        )
        .bind(now, userId, clientId),
    ]);
    return Number(deleted?.meta.changes ?? 0) > 0;
  },

  async getClient(clientId) {
    const row = await database
      .prepare(
        "SELECT client_id, name, uri FROM oauth_client WHERE client_id = ? AND (disabled IS NULL OR disabled = 0) LIMIT 1",
      )
      .bind(clientId)
      .first<{ client_id: string; name: string | null; uri: string | null }>();
    return row
      ? { clientId: row.client_id, name: row.name, uri: row.uri }
      : null;
  },
});

export const createMemoryMcpConnectionStore = (
  seed: Array<{ userId: string; clientId: string; clientName?: string }> = [],
): McpConnectionStore => {
  const consents = new Map<string, McpConnection & { userId: string }>();
  const key = (userId: string, clientId: string) =>
    `${userId}\u0000${clientId}`;
  for (const entry of seed) {
    consents.set(key(entry.userId, entry.clientId), {
      userId: entry.userId,
      clientId: entry.clientId,
      clientName: entry.clientName ?? null,
      clientUri: null,
      scopes: ["openid", "mcp"],
      connectedAt: 0,
      updatedAt: 0,
    });
  }

  return {
    async hasConsent(userId, clientId) {
      return consents.has(key(userId, clientId));
    },
    async list(userId) {
      return [...consents.values()]
        .filter((consent) => consent.userId === userId)
        .map(({ userId: _userId, ...connection }) => connection);
    },
    async revoke(userId, clientId) {
      return consents.delete(key(userId, clientId));
    },
    async getClient(clientId) {
      const consent = [...consents.values()].find(
        (entry) => entry.clientId === clientId,
      );
      return consent
        ? { clientId, name: consent.clientName, uri: consent.clientUri }
        : null;
    },
  };
};
