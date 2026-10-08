import type { CallToolResult } from "@modelcontextprotocol/server";
import {
  MCP_UPLOAD_MAX_BYTES,
  MCP_UPLOAD_TTL_MS,
  type McpUploadPurpose,
} from "@yonyoung/contracts/mcp";
import { normalizeUploadContentType } from "@yonyoung/contracts/uploads";
import type { Context } from "hono";
import type { Actor, Role } from "../../../lib/authorization/types";
import { resolveMcpRuntimeEnv } from "../../../lib/config/runtime-env";
import type { AppDependencies } from "../../../lib/services/dependencies";
import type { PresignService } from "../../../lib/services/types";
import { isAppError } from "../../../shared/errors/AppError";
import type HonoAppType from "../../../types/honoAppType";
import {
  reserveStorageCapacityForUpload,
  settleUploadReservation,
} from "../../uploads/upload-capacity";
import { describeApiFailure, toolFailure } from "../tool-result";
import { StreamLengthMismatchError, enforceExactLength, peekStream } from "./byte-stream";
import { SNIFF_BYTES, matchesDeclaredType, readImageDimensions } from "./file-sniff";
import type { McpObjectStore } from "./mcp-object-store";
import type { McpUploadRecord, McpUploadStore } from "./mcp-upload-store";
import { UPLOAD_PURPOSE_RULES } from "./upload-purpose";

export class McpUploadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "McpUploadError";
  }
}

export type PreparedUpload = {
  uploadId: string;
  putUrl: string;
  browserUrl: string;
  expiresAt: string;
};

export type ResolvedUpload = {
  uploadId: string;
  publicUrl: string;
  fileName: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
};

type FileDeclaration = {
  purpose: McpUploadPurpose;
  fileName: string;
  contentType: string;
  size: number;
};

export type McpUploadServiceDeps = {
  store: McpUploadStore;
  objects: McpObjectStore;
  presign: Pick<PresignService, "allocateManagedObject">;
  reserveCapacity: (actorId: string, fileSize: number) => Promise<{ id: string }>;
  settleReservation: (reservationId: string) => Promise<void>;
  releaseReservation: (reservationId: string) => Promise<void>;
  apiOrigin: string;
  webOrigin: string;
};

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const createUploadToken = (): string => toBase64Url(crypto.getRandomValues(new Uint8Array(32)));

const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const toResolvedUpload = (record: McpUploadRecord): ResolvedUpload => ({
  uploadId: record.id,
  publicUrl: record.publicUrl,
  fileName: record.fileName,
  contentType: record.contentType,
  size: record.declaredSize,
  width: record.width,
  height: record.height,
});

export const createMcpUploadService = (deps: McpUploadServiceDeps) => {
  const assertPurposeAllowed = (actor: Actor, purpose: McpUploadPurpose) => {
    if (!UPLOAD_PURPOSE_RULES[purpose].isAllowed(actor.role)) {
      throw new McpUploadError(403, "이 용도로 파일을 올릴 권한이 없습니다.");
    }
  };

  const validateDeclaration = (input: FileDeclaration): string => {
    const rule = UPLOAD_PURPOSE_RULES[input.purpose];
    const contentType = normalizeUploadContentType(input.contentType);
    if (!rule.allowedContentTypes.includes(contentType)) {
      throw new McpUploadError(
        415,
        `${contentType} 형식은 올릴 수 없습니다. 허용 형식: ${rule.allowedContentTypes.join(", ")}`,
      );
    }
    if (!Number.isSafeInteger(input.size) || input.size <= 0) {
      throw new McpUploadError(422, "파일 크기가 올바르지 않습니다.");
    }
    if (input.size > MCP_UPLOAD_MAX_BYTES) {
      throw new McpUploadError(
        413,
        "MCP로는 파일당 100MB까지 올릴 수 있습니다. 더 큰 파일은 대시보드에서 올려 주세요.",
      );
    }
    if (input.fileName.trim().length === 0) {
      throw new McpUploadError(422, "파일 이름이 비어 있습니다.");
    }
    return contentType;
  };

  const createRecord = async (actor: Actor, input: FileDeclaration) => {
    const contentType = validateDeclaration(input);
    const rule = UPLOAD_PURPOSE_RULES[input.purpose];
    const reservation = await deps.reserveCapacity(actor.id, input.size);
    try {
      const { objectKey, publicUrl } = await deps.presign.allocateManagedObject({
        actorId: actor.id,
        resource: rule.resourcePath,
        slot: rule.slot,
        fileName: input.fileName,
      });
      const token = createUploadToken();
      const now = Date.now();
      const record: McpUploadRecord = {
        id: crypto.randomUUID(),
        tokenHash: await sha256Hex(token),
        userId: actor.id,
        purpose: input.purpose,
        fileName: input.fileName,
        contentType,
        declaredSize: input.size,
        objectKey,
        publicUrl,
        width: null,
        height: null,
        reservationId: reservation.id,
        status: "pending",
        expiresAt: now + MCP_UPLOAD_TTL_MS,
        createdAt: now,
        completedAt: null,
      };
      await deps.store.create(record);
      return { record, token };
    } catch (error) {
      await deps.releaseReservation(reservation.id);
      throw error;
    }
  };

  /** 형식 검사를 R2 쓰기 전에 끝내고, 길이가 선언과 정확히 같을 때만 저장을 마친다. */
  const finish = async (
    record: McpUploadRecord,
    body: ReadableStream<Uint8Array>,
  ): Promise<McpUploadRecord> => {
    try {
      const { head, stream } = await peekStream(body, SNIFF_BYTES);
      if (!matchesDeclaredType(record.contentType, head)) {
        await stream.cancel();
        throw new McpUploadError(415, "파일 내용이 선언한 형식과 다릅니다.");
      }
      const dimensions =
        UPLOAD_PURPOSE_RULES[record.purpose].kind === "image"
          ? readImageDimensions(record.contentType, head)
          : null;
      await deps.objects.put(record.objectKey, enforceExactLength(stream, record.declaredSize), {
        contentType: record.contentType,
        size: record.declaredSize,
      });

      const completed = {
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        completedAt: Date.now(),
      };
      await deps.store.complete(record.id, completed);
      if (record.reservationId) {
        await deps.settleReservation(record.reservationId);
      }
      return { ...record, ...completed, status: "completed" };
    } catch (error) {
      await deps.store.fail(record.id);
      await deps.objects.delete(record.objectKey).catch(() => undefined);
      if (record.reservationId) {
        await deps.releaseReservation(record.reservationId);
      }
      if (error instanceof StreamLengthMismatchError) {
        throw new McpUploadError(400, "받은 파일 크기가 선언한 크기와 다릅니다.");
      }
      throw error;
    }
  };

  const findOwned = async (actor: Actor, uploadId: string): Promise<McpUploadRecord> => {
    const record = await deps.store.getById(uploadId);
    if (!record || record.userId !== actor.id) {
      throw new McpUploadError(404, `업로드를 찾을 수 없습니다: ${uploadId}`);
    }
    return record;
  };

  return {
    putUrlFor: (token: string) => `${deps.apiOrigin}/mcp/uploads/${token}`,

    async prepare(actor: Actor, input: FileDeclaration): Promise<PreparedUpload> {
      assertPurposeAllowed(actor, input.purpose);
      const { record, token } = await createRecord(actor, input);
      return {
        uploadId: record.id,
        putUrl: `${deps.apiOrigin}/mcp/uploads/${token}`,
        browserUrl: `${deps.webOrigin}/dashboard/mcp/upload/${token}`,
        expiresAt: new Date(record.expiresAt).toISOString(),
      };
    },

    async receive(
      token: string,
      input: { contentLength: number | null; body: ReadableStream<Uint8Array> | null },
    ): Promise<McpUploadRecord> {
      const record = await deps.store.getByTokenHash(await sha256Hex(token));
      if (!record) {
        throw new McpUploadError(404, "업로드 주소를 찾을 수 없습니다.");
      }
      if (record.status !== "pending") {
        throw new McpUploadError(409, "이미 사용한 업로드 주소입니다.");
      }
      if (record.expiresAt <= Date.now()) {
        throw new McpUploadError(410, "업로드 주소가 만료되었습니다. upload_prepare를 다시 호출해 주세요.");
      }
      if (input.contentLength === null) {
        throw new McpUploadError(411, "Content-Length 헤더가 필요합니다. curl -T로 파일을 보내 주세요.");
      }
      if (input.contentLength !== record.declaredSize) {
        throw new McpUploadError(
          400,
          `보낸 크기(${input.contentLength} bytes)가 준비할 때 알려준 크기(${record.declaredSize} bytes)와 다릅니다.`,
        );
      }
      if (!input.body) {
        throw new McpUploadError(400, "파일 본문이 비어 있습니다.");
      }
      if (!(await deps.store.beginReceiving(record.id, Date.now()))) {
        throw new McpUploadError(409, "이미 사용한 업로드 주소입니다.");
      }
      return finish(record, input.body);
    },

    async ingest(
      actor: Actor,
      input: FileDeclaration & { body: ReadableStream<Uint8Array> },
    ): Promise<McpUploadRecord> {
      assertPurposeAllowed(actor, input.purpose);
      const { record } = await createRecord(actor, input);
      await deps.store.beginReceiving(record.id, Date.now());
      return finish(record, input.body);
    },

    status: findOwned,

    async lookupByToken(actor: Actor, token: string): Promise<McpUploadRecord> {
      const record = await deps.store.getByTokenHash(await sha256Hex(token));
      if (!record || record.userId !== actor.id) {
        throw new McpUploadError(404, "업로드 주소를 찾을 수 없습니다.");
      }
      return record;
    },

    async resolveCompleted(
      actor: Actor,
      purpose: McpUploadPurpose,
      uploadIds: string[],
    ): Promise<ResolvedUpload[]> {
      const resolved: ResolvedUpload[] = [];
      for (const uploadId of uploadIds) {
        const record = await findOwned(actor, uploadId);
        if (record.purpose !== purpose) {
          throw new McpUploadError(
            422,
            `${uploadId}는 ${record.purpose} 용도로 준비한 업로드입니다. ${purpose} 용도로 다시 준비해 주세요.`,
          );
        }
        if (record.status === "consumed") {
          throw new McpUploadError(409, `이미 사용한 업로드입니다: ${uploadId}`);
        }
        if (record.status !== "completed") {
          throw new McpUploadError(
            409,
            `아직 업로드가 끝나지 않았습니다: ${uploadId} (${record.status}). upload_status로 확인해 주세요.`,
          );
        }
        resolved.push(toResolvedUpload(record));
      }
      return resolved;
    },

    async claim(actor: Actor, uploads: ResolvedUpload[]): Promise<void> {
      const ids = uploads.map((upload) => upload.uploadId);
      const claimed = await deps.store.claim(ids, actor.id);
      if (claimed.length !== ids.length) {
        await deps.store.release(claimed);
        throw new McpUploadError(409, "이미 사용한 업로드가 섞여 있습니다. 새로 올려 주세요.");
      }
    },

    async release(uploads: ResolvedUpload[]): Promise<void> {
      await deps.store.release(uploads.map((upload) => upload.uploadId));
    },
  };
};

export type McpUploadService = ReturnType<typeof createMcpUploadService>;

export const createRequestMcpUploadService = (
  c: Context<HonoAppType>,
  dependencies: AppDependencies,
): McpUploadService => {
  const mcpEnv = resolveMcpRuntimeEnv(c.env);
  const reservationStore = dependencies.getUploadReservationStore(c);

  return createMcpUploadService({
    store: dependencies.getMcpUploadStore(c),
    objects: dependencies.getMcpObjectStore(c),
    presign: dependencies.getPresignService(c),
    reserveCapacity: async (actorId, fileSize) => {
      try {
        return await reserveStorageCapacityForUpload({
          c,
          dependencies,
          actorId,
          fileSize,
          grantTtlMs: MCP_UPLOAD_TTL_MS,
          // 버려진 준비도 사용자 용량 한도에 잡힌다. 토큰은 10분 뒤 쓸 수 없으므로
          // 하루가 아니라 진행 중인 PUT이 끝날 여유(1시간)만 더 잡아 둔다.
          capacityTtlMs: MCP_UPLOAD_TTL_MS + 60 * 60 * 1000,
        });
      } catch (error) {
        if (isAppError(error)) {
          throw new McpUploadError(error.httpStatus, error.message);
        }
        throw error;
      }
    },
    settleReservation: (reservationId) => settleUploadReservation(reservationStore, reservationId, c),
    releaseReservation: (reservationId) =>
      reservationStore.remove(reservationId).catch(() => undefined),
    apiOrigin: new URL(mcpEnv.resourceUrl).origin,
    webOrigin: new URL(mcpEnv.issuer).origin,
  });
};

/** 업로드 오류를 도구 결과로 바꾼다. 업로드 오류가 아니면 다시 던져 SDK가 처리하게 한다. */
export const uploadErrorResult = (error: unknown, role: Role): CallToolResult => {
  if (!(error instanceof McpUploadError)) {
    throw error;
  }
  return toolFailure(
    describeApiFailure(
      { ok: false, status: error.status, code: "UPLOAD_ERROR", message: error.message, requestId: null },
      role,
    ),
  );
};
