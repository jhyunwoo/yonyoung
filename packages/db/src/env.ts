export interface AppEnv {
  DB: D1Database;
  ASSETS: R2Bucket;
  CACHE: KVNamespace;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  ADMIN_ALLOWLIST_EMAILS?: string;
}

export type AppContextEnv = {
  Bindings: AppEnv;
};
