import {
  MCP_TOOL_CATEGORIES,
  MCP_TOOL_CATEGORY_LABELS,
  type ApiMcpToolSummary,
  type McpToolCategory,
} from "@yonyoung/contracts/mcp";

export type McpToolGroup = {
  category: McpToolCategory;
  label: string;
  tools: ApiMcpToolSummary[];
};

export const groupToolsByCategory = (tools: ApiMcpToolSummary[]): McpToolGroup[] =>
  MCP_TOOL_CATEGORIES.map((category) => ({
    category,
    label: MCP_TOOL_CATEGORY_LABELS[category],
    tools: tools.filter((tool) => tool.category === category),
  })).filter((group) => group.tools.length > 0);
