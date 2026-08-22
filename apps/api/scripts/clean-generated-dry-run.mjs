import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const wranglerDirectory = path.join(apiRoot, ".wrangler");
const dryRunDirectory = path.join(wranglerDirectory, "dry-run");

if (path.dirname(dryRunDirectory) !== wranglerDirectory) {
  throw new Error("Refusing to clean an unexpected Wrangler output path.");
}

await rm(dryRunDirectory, { force: true, recursive: true });
