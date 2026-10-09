import type { CallToolResult } from "@modelcontextprotocol/server";
import type { McpToolContext } from "./tool-definition";
import { describeApiFailure, toolFailure, toolSuccess } from "./tool-result";

/** 커버 없이 만들 때 넣는 웹 정적 이미지. 사용자가 대시보드에서 바꾼다. */
const DEFAULT_COVER_IMAGE_PATH = "/yonyoung-logo-black.png";

type DashboardResource = "activities" | "exhibitions";

/** 웹의 buildDashboardGenerationPath와 같은 규칙으로 수정 화면 주소를 만든다. */
const buildEditUrl = async (
  context: McpToolContext,
  resource: DashboardResource,
  record: { id: string; generationId: string },
): Promise<string> => {
  const generation = await context.api.call({
    method: "GET",
    path: `/api/generations/${record.generationId}`,
  });
  if (!generation.ok) {
    // 기록은 이미 만들어졌으므로 실패로 돌려주면 다시 만들게 된다.
    return `${context.webOrigin}/dashboard`;
  }
  const name = (generation.data as { name: string }).name.trim();
  return `${context.webOrigin}/dashboard/${encodeURIComponent(name)}/${resource}/${record.id}/edit`;
};

/**
 * 사진은 MCP로 받지 않는다. 커버가 없으면 기본 이미지로 만들고,
 * 사용자가 커버와 사진을 직접 올릴 대시보드 수정 화면 주소를 돌려준다.
 */
export const createWithDashboardLink = async (
  context: McpToolContext,
  input: {
    resource: DashboardResource;
    data: { coverImageUrl?: string; generationId: string };
    summary: string;
  },
): Promise<CallToolResult> => {
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

  const record = created.data as { id: string; generationId: string };
  const dashboardUrl = await buildEditUrl(context, input.resource, record);
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
