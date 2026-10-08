declare module "cloudflare:test" {
  export function createExecutionContext(): ExecutionContext;
  export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
  export const env: Record<string, unknown>;
  export interface D1Migration {
    name: string;
    queries: string[];
  }
  export function applyD1Migrations(
    db: D1Database,
    migrations: D1Migration[],
    migrationsTableName?: string,
  ): Promise<void>;
}
