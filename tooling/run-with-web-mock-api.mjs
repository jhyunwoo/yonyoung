import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const command = process.argv.slice(2);
const mockPort = process.env.MOCK_API_PORT ?? "4010";
const healthUrl = `http://127.0.0.1:${mockPort}/__test/health`;
const commandEnvironment = {
  ...process.env,
  API_BASE_URL: process.env.API_BASE_URL ?? `http://127.0.0.1:${mockPort}`,
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3005",
};

if (command.length === 0) {
  throw new Error("Usage: run-with-web-mock-api.mjs <command> [...args]");
}

const isReady = async () => {
  try {
    return (await fetch(healthUrl)).ok;
  } catch {
    return false;
  }
};

let mockServer;
let ownsMockServer = false;

const stopMockServer = () => {
  if (ownsMockServer && mockServer && !mockServer.killed) {
    mockServer.kill("SIGTERM");
  }
};

process.once("SIGINT", () => {
  stopMockServer();
  process.exitCode = 130;
});
process.once("SIGTERM", () => {
  stopMockServer();
  process.exitCode = 143;
});

try {
  if (!(await isReady())) {
    ownsMockServer = true;
    mockServer = spawn(
      "pnpm",
      [
        "--filter",
        "@yonyoung/web",
        "exec",
        "tsx",
        "tests/e2e/mock-api/server.ts",
      ],
      {
        cwd: repositoryRoot,
        env: { ...process.env, MOCK_API_PORT: mockPort },
        stdio: "inherit",
      },
    );

    const deadline = Date.now() + 120_000;
    while (!(await isReady())) {
      if (mockServer.exitCode !== null) {
        throw new Error(`Web mock API exited with code ${mockServer.exitCode}`);
      }
      if (Date.now() >= deadline) {
        throw new Error(`Web mock API did not become ready at ${healthUrl}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  const child = spawn(command[0], command.slice(1), {
    cwd: repositoryRoot,
    env: commandEnvironment,
    stdio: "inherit",
  });

  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
} finally {
  stopMockServer();
}
