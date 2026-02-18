import { Actor } from "../lib/authorization/types";

export type AppBindings = CloudflareBindings & {
  r2?: R2Bucket;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_TRUSTED_ORIGINS?: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  PASSKEY_RP_ID?: string;
  PASSKEY_RP_NAME?: string;
  PASSKEY_ORIGIN?: string;
  R2_S3_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
  R2_PUBLIC_BASE_URL?: string;
  DOCS_AUTH_IN_PROD?: string;
};

type HonoAppType = {
  Bindings: AppBindings;
  Variables: {
    actor: Actor | null;
  };
};

export default HonoAppType;
