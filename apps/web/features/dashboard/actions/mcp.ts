"use server";

import {
  readNoContentSchema,
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";

export const revokeMcpConnectionAction = async (
  clientId: string,
): Promise<AdminWriteActionResult<undefined>> =>
  writeRequest({
    path: `/mcp/connections/${encodeURIComponent(clientId)}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    tags: [],
    accessScope: "verified_member",
  });
