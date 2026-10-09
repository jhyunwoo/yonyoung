import type { CallToolResult } from "@modelcontextprotocol/server";
import { CORE_ROLE_LABELS } from "@yonyoung/contracts/auth-roles";
import type { Role } from "../../lib/authorization/types";
import type { InternalApiFailure, InternalApiResult } from "./internal-api";

const guidanceByStatus = (status: number, role: Role): string => {
  if (status === 401) {
    return "연영 연결이 만료되었습니다. 커넥터를 다시 연결해 주세요.";
  }
  if (status === 403) {
    return `현재 역할(${CORE_ROLE_LABELS[role]})로는 할 수 없는 작업입니다.`;
  }
  if (status === 404) {
    return "대상을 찾을 수 없습니다. ID를 다시 확인해 주세요.";
  }
  if (status === 409) {
    return "다른 변경과 충돌했습니다. 최신 상태를 다시 조회한 뒤 시도해 주세요.";
  }
  if (status === 413) {
    return "용량 한도를 넘었습니다.";
  }
  if (status === 400 || status === 422) {
    return "입력값이 올바르지 않습니다.";
  }
  if (status >= 500) {
    return "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
  return "요청을 처리하지 못했습니다.";
};

export const describeApiFailure = (
  failure: InternalApiFailure,
  role: Role,
): string => {
  const lines = [
    guidanceByStatus(failure.status, role),
    `사유: ${failure.message}`,
  ];
  if (failure.requestId) {
    lines.push(`요청 ID: ${failure.requestId}`);
  }
  return lines.join("\n");
};

export const toolSuccess = (
  summary: string,
  data: unknown,
): CallToolResult => ({
  content: [
    {
      type: "text",
      text:
        data === null
          ? summary
          : `${summary}\n\n${JSON.stringify(data, null, 2)}`,
    },
  ],
  structuredContent: { data },
});

export const toolFailure = (message: string): CallToolResult => ({
  isError: true,
  content: [{ type: "text", text: message }],
});

export const toToolResult = (
  result: InternalApiResult,
  input: { summary: string; role: Role },
): CallToolResult =>
  result.ok
    ? toolSuccess(input.summary, result.data)
    : toolFailure(describeApiFailure(result, input.role));
