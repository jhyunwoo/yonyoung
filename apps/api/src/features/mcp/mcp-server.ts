import { McpServer } from "@modelcontextprotocol/server";
import type { McpToolName } from "@yonyoung/contracts/mcp";
import { listExposedTools } from "./exposure";
import type { McpToolContext, McpToolDefinition } from "./tool-definition";

const MCP_SERVER_INFO = { name: "yonyoung-dashboard", version: "1.0.0" };

const MCP_SERVER_INSTRUCTIONS = [
  "연영 홈페이지 대시보드를 다루는 도구입니다.",
  "- 무엇을 할 수 있는지 모르면 whoami를 먼저 호출하세요.",
  "- ID가 필요한 도구는 generation_list, activity_list 같은 목록 도구로 ID를 먼저 찾으세요.",
  "- 삭제나 역할 변경처럼 되돌리기 어려운 작업은 실행 전에 사용자에게 확인하세요.",
  "- Claude에서 채팅에 첨부한 파일을 올릴 때: upload_prepare → 코드 실행 환경에서 `curl -sS -T <파일> <put_url>` → 실패하면 사용자에게 browser_url을 안내하고 upload_status로 완료 확인 → upload_id를 파일 도구에 넘깁니다.",
  "- ChatGPT에서는 채팅에 올린 파일이 파일 인자로 자동 전달됩니다.",
].join("\n");

/**
 * 요청한 사용자의 역할로 노출되는 도구만 등록한 서버를 만든다.
 * 요청마다 새로 만들므로 역할이 바뀌면 다음 요청부터 목록이 달라진다.
 */
export const buildMcpServer = (
  context: McpToolContext,
  definitions: ReadonlyMap<McpToolName, McpToolDefinition>,
): McpServer => {
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions: MCP_SERVER_INSTRUCTIONS,
  });

  for (const tool of listExposedTools(context.actor.role)) {
    const definition = definitions.get(tool.name as McpToolName);
    if (!definition) {
      continue;
    }
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: definition.inputSchema,
        annotations: {
          title: tool.title,
          readOnlyHint: tool.readOnly,
          destructiveHint: tool.destructive,
          openWorldHint: false,
        },
        ...(tool.fileArgs.length > 0
          ? { _meta: { "openai/fileParams": [...tool.fileArgs] } }
          : {}),
      },
      (args) => definition.handler(args, context),
    );
  }

  return server;
};
