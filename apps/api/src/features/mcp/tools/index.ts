import type { McpToolName } from "@yonyoung/contracts/mcp";
import type { McpToolDefinition } from "../tool-definition";
import { accountTools } from "./account.tools";
import { activityTools } from "./activity.tools";
import { attachmentTools } from "./attachment.tools";
import { exhibitionTools } from "./exhibition.tools";
import { generationTools } from "./generation.tools";
import { linktreeTools } from "./linktree.tools";
import { memberTools } from "./member.tools";
import { settingsTools } from "./settings.tools";
import { statsTools } from "./stats.tools";
import { uploadTools } from "./upload.tools";

const ALL_TOOLS: McpToolDefinition[] = [
  ...accountTools,
  ...generationTools,
  ...activityTools,
  ...exhibitionTools,
  ...linktreeTools,
  ...attachmentTools,
  ...memberTools,
  ...settingsTools,
  ...statsTools,
  ...uploadTools,
];

export const MCP_TOOL_DEFINITIONS: ReadonlyMap<McpToolName, McpToolDefinition> =
  new Map(ALL_TOOLS.map((tool) => [tool.name, tool]));
