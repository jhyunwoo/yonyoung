import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  API_BASE_URL: z.url().transform((value) => value.replace(/\/+$/, "")),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  // API Worker와 공유하는 비밀. 있으면 BFF가 방문자 IP를 API에 전달한다(선택).
  // 잘못된 값 하나로 getEnv 전체가 실패하면 모든 API 호출이 막히므로 형식은 강제하지 않는다.
  PROXY_CLIENT_IP_SECRET: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

const formatZodIssues = (issues: z.core.$ZodIssue[]): string =>
  issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");

export const getEnv = (): Env => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables: ${formatZodIssues(parsed.error.issues)}`,
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};

export const getApiBaseUrl = (): string => getEnv().API_BASE_URL;

export const getProxyClientIpSecret = (): string | undefined =>
  getEnv().PROXY_CLIENT_IP_SECRET;
