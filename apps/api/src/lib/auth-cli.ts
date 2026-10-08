import { createAuthWithEnv } from "./auth";
import { resolveAuthRuntimeEnv } from "./config/runtime-env";

// Better Auth CLI needs an exported auth instance for schema generation.
// Worker 코드는 이 파일을 import하지 않는다. 생성 시 oauth-provider가 DB에 리소스를 시드하기 때문이다.
export const auth = createAuthWithEnv(
  {} as D1Database,
  resolveAuthRuntimeEnv(undefined, true),
);
