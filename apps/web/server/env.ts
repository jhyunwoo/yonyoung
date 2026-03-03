import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  API_BASE_URL: z.url().transform((value) => value.replace(/\/+$/, "")),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REVALIDATE_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");

  throw new Error(`Invalid environment variables: ${details}`);
}

export const env = parsed.data;
