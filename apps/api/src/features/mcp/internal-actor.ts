import type { Actor } from "../../lib/authorization/types";
import type { AppDependencies } from "../../lib/services/dependencies";

/**
 * MCP 도구가 기존 라우트를 같은 Worker 안에서 호출할 때 Actor를 실어 보내는 env 키.
 * 외부 HTTP 요청은 env를 만들 수 없으므로 이 경로로 Actor를 위조할 수 없다.
 * Symbol.for가 아닌 Symbol을 써서 모듈 밖에서는 같은 키를 만들 수 없게 한다.
 */
export const MCP_ACTOR: unique symbol = Symbol("yonyoung.mcp.actor");

type EnvWithInternalActor = { [MCP_ACTOR]?: Actor };

export const withInternalActor = <TEnv extends object>(
  env: TEnv | undefined,
  actor: Actor,
): TEnv => ({ ...(env ?? {}), [MCP_ACTOR]: actor }) as TEnv;

export const readInternalActor = (env: unknown): Actor | undefined => {
  if (typeof env !== "object" || env === null) {
    return undefined;
  }
  return (env as EnvWithInternalActor)[MCP_ACTOR];
};

export const withInternalActorResolution = (
  dependencies: AppDependencies,
): AppDependencies => ({
  ...dependencies,
  resolveActor: (c) => readInternalActor(c.env) ?? dependencies.resolveActor(c),
});
