import type { McpUploadPurpose, McpUploadStatus } from "@yonyoung/contracts/mcp";

export type McpUploadRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  purpose: McpUploadPurpose;
  fileName: string;
  contentType: string;
  declaredSize: number;
  objectKey: string;
  publicUrl: string;
  width: number | null;
  height: number | null;
  reservationId: string | null;
  status: McpUploadStatus;
  expiresAt: number;
  createdAt: number;
  completedAt: number | null;
};

export interface McpUploadStore {
  create(record: McpUploadRecord): Promise<void>;
  getById(id: string): Promise<McpUploadRecord | null>;
  getByTokenHash(tokenHash: string): Promise<McpUploadRecord | null>;
  /** pending이고 만료 전일 때만 receiving으로 바꾼다. 동시 PUT 중 하나만 true를 받는다. */
  beginReceiving(id: string, now: number): Promise<boolean>;
  complete(
    id: string,
    input: { width: number | null; height: number | null; completedAt: number },
  ): Promise<void>;
  fail(id: string): Promise<void>;
  /** completed인 소유자의 업로드를 consumed로 바꾸고 바뀐 ID를 돌려준다. */
  claim(ids: string[], userId: string): Promise<string[]>;
  /** 도구 호출이 실패했을 때 consumed를 completed로 되돌린다. */
  release(ids: string[]): Promise<void>;
}

type UploadRow = {
  id: string;
  token_hash: string;
  user_id: string;
  purpose: string;
  file_name: string;
  content_type: string;
  declared_size: number;
  object_key: string;
  public_url: string;
  width: number | null;
  height: number | null;
  reservation_id: string | null;
  status: string;
  expires_at: number;
  created_at: number;
  completed_at: number | null;
};

const toRecord = (row: UploadRow): McpUploadRecord => ({
  id: row.id,
  tokenHash: row.token_hash,
  userId: row.user_id,
  purpose: row.purpose as McpUploadPurpose,
  fileName: row.file_name,
  contentType: row.content_type,
  declaredSize: Number(row.declared_size),
  objectKey: row.object_key,
  publicUrl: row.public_url,
  width: row.width === null ? null : Number(row.width),
  height: row.height === null ? null : Number(row.height),
  reservationId: row.reservation_id,
  status: row.status as McpUploadStatus,
  expiresAt: Number(row.expires_at),
  createdAt: Number(row.created_at),
  completedAt: row.completed_at === null ? null : Number(row.completed_at),
});

// D1은 문 하나에 바인딩 값을 100개까지 받는다. claim은 userId를 하나 더 묶으므로 여유를 둔다.
const D1_ID_CHUNK_SIZE = 90;

const chunkIds = (ids: string[]): string[][] => {
  const chunks: string[][] = [];
  for (let start = 0; start < ids.length; start += D1_ID_CHUNK_SIZE) {
    chunks.push(ids.slice(start, start + D1_ID_CHUNK_SIZE));
  }
  return chunks;
};

export const createD1McpUploadStore = (
  database: Pick<D1Database, "prepare">,
): McpUploadStore => ({
  async create(record) {
    await database
      .prepare(
        `
        INSERT INTO mcp_uploads (
          id, token_hash, user_id, purpose, file_name, content_type, declared_size,
          object_key, public_url, width, height, reservation_id, status,
          expires_at, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .bind(
        record.id,
        record.tokenHash,
        record.userId,
        record.purpose,
        record.fileName,
        record.contentType,
        record.declaredSize,
        record.objectKey,
        record.publicUrl,
        record.width,
        record.height,
        record.reservationId,
        record.status,
        record.expiresAt,
        record.createdAt,
        record.completedAt,
      )
      .run();
  },

  async getById(id) {
    const row = await database
      .prepare("SELECT * FROM mcp_uploads WHERE id = ? LIMIT 1")
      .bind(id)
      .first<UploadRow>();
    return row ? toRecord(row) : null;
  },

  async getByTokenHash(tokenHash) {
    const row = await database
      .prepare("SELECT * FROM mcp_uploads WHERE token_hash = ? LIMIT 1")
      .bind(tokenHash)
      .first<UploadRow>();
    return row ? toRecord(row) : null;
  },

  async beginReceiving(id, now) {
    const result = await database
      .prepare(
        "UPDATE mcp_uploads SET status = 'receiving' WHERE id = ? AND status = 'pending' AND expires_at > ?",
      )
      .bind(id, now)
      .run();
    return Number(result.meta.changes ?? 0) === 1;
  },

  async complete(id, input) {
    await database
      .prepare(
        "UPDATE mcp_uploads SET status = 'completed', width = ?, height = ?, completed_at = ? WHERE id = ? AND status = 'receiving'",
      )
      .bind(input.width, input.height, input.completedAt, id)
      .run();
  },

  async fail(id) {
    await database
      .prepare(
        "UPDATE mcp_uploads SET status = 'failed' WHERE id = ? AND status IN ('pending', 'receiving')",
      )
      .bind(id)
      .run();
  },

  async claim(ids, userId) {
    const claimed: string[] = [];
    for (const chunk of chunkIds(ids)) {
      const placeholders = chunk.map(() => "?").join(", ");
      const result = await database
        .prepare(
          `UPDATE mcp_uploads SET status = 'consumed'
           WHERE user_id = ? AND status = 'completed' AND id IN (${placeholders})
           RETURNING id`,
        )
        .bind(userId, ...chunk)
        .all<{ id: string }>();
      claimed.push(...result.results.map((row) => row.id));
    }
    return claimed;
  },

  async release(ids) {
    for (const chunk of chunkIds(ids)) {
      const placeholders = chunk.map(() => "?").join(", ");
      await database
        .prepare(
          `UPDATE mcp_uploads SET status = 'completed'
           WHERE status = 'consumed' AND id IN (${placeholders})`,
        )
        .bind(...chunk)
        .run();
    }
  },
});

export const createMemoryMcpUploadStore = (): McpUploadStore => {
  const records = new Map<string, McpUploadRecord>();
  const update = (id: string, patch: Partial<McpUploadRecord>) => {
    const current = records.get(id);
    if (current) {
      records.set(id, { ...current, ...patch });
    }
  };

  return {
    async create(record) {
      records.set(record.id, { ...record });
    },
    async getById(id) {
      return records.get(id) ?? null;
    },
    async getByTokenHash(tokenHash) {
      return [...records.values()].find((record) => record.tokenHash === tokenHash) ?? null;
    },
    async beginReceiving(id, now) {
      const current = records.get(id);
      if (!current || current.status !== "pending" || current.expiresAt <= now) {
        return false;
      }
      update(id, { status: "receiving" });
      return true;
    },
    async complete(id, input) {
      if (records.get(id)?.status === "receiving") {
        update(id, { status: "completed", ...input });
      }
    },
    async fail(id) {
      const status = records.get(id)?.status;
      if (status === "pending" || status === "receiving") {
        update(id, { status: "failed" });
      }
    },
    async claim(ids, userId) {
      const claimed: string[] = [];
      for (const id of ids) {
        const current = records.get(id);
        if (current && current.userId === userId && current.status === "completed") {
          update(id, { status: "consumed" });
          claimed.push(id);
        }
      }
      return claimed;
    },
    async release(ids) {
      for (const id of ids) {
        if (records.get(id)?.status === "consumed") {
          update(id, { status: "completed" });
        }
      }
    },
  };
};
