import { Context } from "hono";
import { ZodType } from "zod";

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

const createErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues?: Array<{ message?: string }> }).issues;
    if (issues && issues.length > 0) {
      return issues.map((issue) => issue.message ?? "유효성 검사 실패").join(", ");
    }
  }

  return "요청 데이터가 올바르지 않습니다.";
};

export const parseParams = <T>(
  c: Context,
  schema: ZodType<T>,
): ParseResult<T> => {
  const parsed = schema.safeParse(c.req.param());
  if (!parsed.success) {
    return { success: false, message: createErrorMessage(parsed.error) };
  }
  return { success: true, data: parsed.data };
};

export const parseQuery = <T>(
  c: Context,
  schema: ZodType<T>,
): ParseResult<T> => {
  const parsed = schema.safeParse(c.req.query());
  if (!parsed.success) {
    return { success: false, message: createErrorMessage(parsed.error) };
  }
  return { success: true, data: parsed.data };
};

export const parseBody = async <T>(
  c: Context,
  schema: ZodType<T>,
): Promise<ParseResult<T>> => {
  const raw = await c.req.json().catch(() => null);
  if (!raw) {
    return { success: false, message: "JSON 본문이 필요합니다." };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: createErrorMessage(parsed.error) };
  }

  return { success: true, data: parsed.data };
};
