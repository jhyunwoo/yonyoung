import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const auditRoot = mkdtempSync(path.join(tmpdir(), "yonyoung-api-audit-"));

const run = (args, cwd) => {
  const result = spawnSync("pnpm", args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }

  return true;
};

try {
  const pruned = run(
    ["turbo", "prune", "@yonyoung/api", "--out-dir", auditRoot],
    repositoryRoot,
  );

  if (pruned) {
    run(["audit", "--prod", "--audit-level", "critical"], auditRoot);
  }
} finally {
  rmSync(auditRoot, { force: true, recursive: true });
}
