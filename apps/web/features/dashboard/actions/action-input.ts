import type { z } from "zod";
import type { AdminWriteActionFailure } from "@/features/dashboard/actions/admin-write-core";

/*
 * 서버 액션 입력 검증. 서버 전용 의존성이 없는 순수 모듈이라 액션 파일과 테스트가
 * admin-write-core(쿠키·헤더·세션)를 끌어오지 않고 쓸 수 있다.
 */

const describeIssuePath = (path: readonly PropertyKey[]): string => {
  const visible = path.filter((segment) => typeof segment !== "symbol").map(String);
  return visible.length > 0 ? `'${visible.join(".")}'` : "요청";
};

/** 계약 스키마 검증 실패를 사용자에게 보여줄 한국어 문장으로 바꾼다. */
export const describeValidationIssue = (issue: z.core.$ZodIssue | undefined): string => {
  if (!issue) {
    return "입력값 형식을 확인해 주세요.";
  }

  const field = describeIssuePath(issue.path);
  switch (issue.code) {
    case "too_big":
      return issue.origin === "string"
        ? `${field} 항목은 최대 ${String(issue.maximum)}자까지 입력할 수 있습니다.`
        : issue.origin === "array"
          ? `${field} 항목은 한 번에 최대 ${String(issue.maximum)}개까지 처리할 수 있습니다.`
          : `${field} 항목의 값이 허용 범위를 넘었습니다.`;
    case "too_small":
      return issue.origin === "string"
        ? `${field} 항목을 입력해 주세요.`
        : `${field} 항목의 값이 허용 범위보다 작습니다.`;
    case "invalid_format":
      return `${field} 항목의 형식이 올바르지 않습니다.`;
    default:
      return `${field} 입력값을 확인해 주세요.`;
  }
};

/**
 * 서버 액션 입력을 계약 스키마로 검증한다.
 *
 * `schema.parse`를 그대로 쓰면 ZodError가 액션 밖으로 던져지고, 프로덕션 Next.js는 그 메시지를
 * "An error occurred in the Server Components render…"로 가려 관리자에게 영문 오류만 보인다.
 * 실패를 결과 값(400 VALIDATION_ERROR)으로 돌려 폼이 원인을 그대로 표시하게 한다.
 */
export const parseActionInput = <TOutput>(
  schema: z.ZodType<TOutput>,
  input: unknown,
): { ok: true; data: TOutput } | AdminWriteActionFailure => {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  return {
    ok: false,
    errorMessage: describeValidationIssue(parsed.error.issues[0]),
    status: 400,
    code: "VALIDATION_ERROR",
    requestId: null,
  };
};
