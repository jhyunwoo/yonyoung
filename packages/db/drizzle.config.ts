import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./sql/drizzle",
  dialect: "sqlite",
  strict: true,
  verbose: true
});
