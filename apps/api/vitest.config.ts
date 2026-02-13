import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@yonyoung/auth/server": fileURLToPath(new URL("../../packages/auth/src/server.ts", import.meta.url)),
      "@yonyoung/db": fileURLToPath(new URL("../../packages/db/src/index.ts", import.meta.url)),
      "@yonyoung/schemas": fileURLToPath(new URL("../../packages/schemas/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "node"
  }
});
