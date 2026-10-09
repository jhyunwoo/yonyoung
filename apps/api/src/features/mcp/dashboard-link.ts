import type { CallToolResult } from "@modelcontextprotocol/server";
import type { Actor } from "../../lib/authorization/types";
import { LEADERSHIP_ROLES } from "./exposure";
import type { McpToolContext } from "./tool-definition";
import { describeApiFailure, toolFailure, toolSuccess } from "./tool-result";

/** 커버 없이 만들 때 넣는 웹 정적 이미지. 사용자가 대시보드에서 바꾼다. */
const DEFAULT_COVER_IMAGE_PATH = "/yonyoung-logo-black.png";

type DashboardResource = "activities" | "exhibitions";

/** 웹 getAccessibleGenerations와 같은 기준. 회장단이 아니면 소속 기수만 대시보드에서 열린다. */
const canOpenInDashboard = (actor: Actor, generationId: string): boolean =>
  LEADERSHIP_ROLES.has(actor.role) ||
  actor.generationId === generationId ||
  (actor.generationIds ?? []).includes(generationId);

/**
 * 사진은 MCP로 받지 않는다. 커버가 없으면 기본 이미지로 만들고,
 * 사용자가 커버와 사진을 직접 올릴 대시보드 수정 화면 주소를 돌려준다.
 * 수정 화면을 열 수 없는 기록은 만들지 않는다.
 */
export const createWithDashboardLink = async (
  context: McpToolContext,
  input: {
    resource: DashboardResource;
    data: { coverImageUrl?: string; generationId: string };
    summary: string;
  },
): Promise<CallToolResult> => {
  const generation = await context.api.call({
    method: "GET",
    path: `/api/generations/${input.data.generationId}`,
  });
  if (!generation.ok) {
    return toolFailure(describeApiFailure(generation, context.actor.role));
  }
  if (!canOpenInDashboard(context.actor, input.data.generationId)) {
    return toolFailure(
      "소속 기수가 아니라 대시보드에서 이 기록을 열 수 없습니다. 사진을 올릴 수 없으므로 만들지 않았습니다. 소속 기수로 만들거나 회장단에게 요청해 주세요.",
    );
  }

  const usesDefaultCover = !input.data.coverImageUrl;
  const created = await context.api.call({
    method: "POST",
    path: `/api/${input.resource}`,
    body: {
      ...input.data,
      coverImageUrl:
        input.data.coverImageUrl ??
        `${context.webOrigin}${DEFAULT_COVER_IMAGE_PATH}`,
    },
  });
  if (!created.ok) {
    return toolFailure(describeApiFailure(created, context.actor.role));
  }

  const record = created.data as { id: string };
  // 웹의 buildDashboardGenerationPath와 같은 규칙으로 기수 경로를 만든다.
  const generationName = (generation.data as { name: string }).name.trim();
  const dashboardUrl = `${context.webOrigin}/dashboard/${encodeURIComponent(generationName)}/${input.resource}/${record.id}/edit`;
  return toolSuccess(
    [
      input.summary,
      usesDefaultCover ? "커버는 기본 이미지로 넣었습니다." : null,
      `사진은 MCP로 올릴 수 없습니다. 사용자에게 이 주소에서 커버와 사진을 올리도록 안내하세요: ${dashboardUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    { ...record, dashboard_url: dashboardUrl },
  );
};
