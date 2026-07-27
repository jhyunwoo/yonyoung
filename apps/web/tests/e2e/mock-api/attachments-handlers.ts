import type { ServerResponse } from "node:http";
import type {
  ApiAttachment,
  ApiAttachmentScope,
} from "../../../shared/contracts/api-contracts";
import type { MockRole, MockState } from "./contracts";

/**
 * 첨부파일 mock 핸들러 (server.ts 비대화 방지를 위해 분리).
 *
 * 실제 API와 동일한 규칙을 모사합니다:
 * - 공개 목록은 인증 불필요
 * - 관리자 CRUD: activity scope는 manager 이상, site_donate scope는 회장/부회장만
 */

type ApiErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST";

export type AttachmentHandlerContext = {
  pathname: string;
  method: string;
  requestUrl: URL;
  body: Record<string, unknown> | null;
  response: ServerResponse;
  state: MockState;
  role: MockRole;
  sendData: <T>(response: ServerResponse, data: T, status?: number) => void;
  sendError: (
    response: ServerResponse,
    status: number,
    code: ApiErrorCode,
    message: string,
  ) => void;
};

const isAttachmentScope = (value: unknown): value is ApiAttachmentScope =>
  value === "activity" || value === "site_donate";

/** scope별 쓰기 권한: site_donate는 회장단, activity는 manager 이상 */
const canManageScope = (role: MockRole, scope: ApiAttachmentScope): boolean => {
  if (scope === "site_donate") {
    return role === "president" || role === "vice_president";
  }
  return role === "president" || role === "vice_president" || role === "manager";
};

const listByScope = (
  state: MockState,
  scope: ApiAttachmentScope,
  resourceId: string | null,
): ApiAttachment[] =>
  state.attachments
    .filter(
      (attachment) =>
        attachment.scope === scope &&
        (resourceId
          ? attachment.resourceId === resourceId
          : attachment.resourceId === null),
    )
    .sort((left, right) => left.sortOrder - right.sortOrder);

/** 첨부파일 라우트를 처리했으면 true, 이 핸들러 소관이 아니면 false를 반환합니다. */
export const handleAttachmentRoutes = (ctx: AttachmentHandlerContext): boolean => {
  const { pathname, method, requestUrl, body, response, state, role } = ctx;

  const isPublicList = pathname === "/api/public/attachments" && method === "GET";
  const isAdminCollection = pathname === "/api/attachments";
  const isAdminItem = pathname.startsWith("/api/attachments/");
  if (!isPublicList && !isAdminCollection && !isAdminItem) {
    return false;
  }

  // 공개 목록: 인증 불필요
  if (isPublicList) {
    const scope = requestUrl.searchParams.get("scope");
    if (!isAttachmentScope(scope)) {
      ctx.sendError(response, 400, "BAD_REQUEST", "Invalid scope.");
      return true;
    }
    const resourceId = requestUrl.searchParams.get("resourceId");
    ctx.sendData(response, listByScope(state, scope, resourceId));
    return true;
  }

  // 관리자 라우트: 인증 필수
  if (role === "guest") {
    ctx.sendError(response, 401, "UNAUTHORIZED", "Authentication required.");
    return true;
  }

  if (isAdminCollection && method === "GET") {
    const scope = requestUrl.searchParams.get("scope");
    if (!isAttachmentScope(scope)) {
      ctx.sendError(response, 400, "BAD_REQUEST", "Invalid scope.");
      return true;
    }
    const resourceId = requestUrl.searchParams.get("resourceId");
    ctx.sendData(response, listByScope(state, scope, resourceId));
    return true;
  }

  if (isAdminCollection && method === "POST") {
    const scope = body?.scope;
    if (!isAttachmentScope(scope)) {
      ctx.sendError(response, 400, "BAD_REQUEST", "Invalid scope.");
      return true;
    }
    if (!canManageScope(role, scope)) {
      ctx.sendError(response, 403, "FORBIDDEN", "Insufficient role for scope.");
      return true;
    }

    // 실제 API처럼 파일 필드 세트와 linkUrl 중 하나만 채운다
    const linkUrl = typeof body?.linkUrl === "string" ? body.linkUrl : null;
    const created: ApiAttachment = {
      id: `attach-${crypto.randomUUID()}`,
      scope,
      resourceId:
        scope === "site_donate"
          ? null
          : typeof body?.resourceId === "string"
            ? body.resourceId
            : null,
      title: typeof body?.title === "string" ? body.title : "첨부파일",
      fileUrl: linkUrl
        ? null
        : typeof body?.fileUrl === "string"
          ? body.fileUrl
          : "https://images.mock.local/api/public/media/site/user/file/mock.pdf?sig=mock",
      fileName: linkUrl
        ? null
        : typeof body?.fileName === "string"
          ? body.fileName
          : "mock.pdf",
      fileSize: linkUrl
        ? null
        : typeof body?.fileSize === "number"
          ? body.fileSize
          : 1024,
      mimeType: linkUrl
        ? null
        : typeof body?.mimeType === "string"
          ? body.mimeType
          : "application/pdf",
      linkUrl,
      sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state.attachments.push(created);
    ctx.sendData(response, created, 201);
    return true;
  }

  if (isAdminItem && (method === "PATCH" || method === "DELETE")) {
    const attachmentId = pathname.replace("/api/attachments/", "");
    const attachment = state.attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      ctx.sendError(response, 404, "NOT_FOUND", "Attachment not found.");
      return true;
    }
    if (!canManageScope(role, attachment.scope)) {
      ctx.sendError(response, 403, "FORBIDDEN", "Insufficient role for scope.");
      return true;
    }

    if (method === "PATCH") {
      if (typeof body?.title === "string") {
        attachment.title = body.title;
      }
      if (typeof body?.sortOrder === "number") {
        attachment.sortOrder = body.sortOrder;
      }
      attachment.updatedAt = Date.now();
      ctx.sendData(response, attachment);
      return true;
    }

    state.attachments = state.attachments.filter((item) => item.id !== attachmentId);
    ctx.sendData(response, null, 200);
    return true;
  }

  ctx.sendError(response, 404, "NOT_FOUND", "Route not found.");
  return true;
};
