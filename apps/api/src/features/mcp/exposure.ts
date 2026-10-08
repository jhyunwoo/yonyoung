import {
  MCP_TOOL_CATALOG,
  type McpToolCatalogEntry,
  type McpToolExposure,
} from "@yonyoung/contracts/mcp";
import { can, isManagerLikeRole } from "../../lib/authorization/policy";
import type { Role } from "../../lib/authorization/types";

const LEADERSHIP_ROLES: ReadonlySet<Role> = new Set(["president", "vice_president"]);

export const isToolExposed = (exposure: McpToolExposure, role: Role): boolean => {
  if (role === "unverified") {
    return false;
  }
  switch (exposure.kind) {
    case "verified":
      return true;
    case "manager_like":
      return isManagerLikeRole(role);
    case "leadership":
      return LEADERSHIP_ROLES.has(role);
    case "permission":
      return exposure.anyOf.some(({ resource, action }) => can(role, resource, action));
  }
};

export const listExposedTools = (role: Role): McpToolCatalogEntry[] =>
  MCP_TOOL_CATALOG.filter((tool) => isToolExposed(tool.exposure, role));
