import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const MAX_ATTEMPTS = Number.parseInt(
  process.env.WORKER_DEPLOY_MAX_ATTEMPTS ?? "3",
  10,
);
const BASE_DELAY_MS = Number.parseInt(
  process.env.WORKER_DEPLOY_RETRY_BASE_DELAY_MS ?? "3000",
  10,
);

const TRANSIENT_ERROR_PATTERNS = [
  /fetch failed/i,
  /A fetch request failed/i,
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /ENOTFOUND/i,
  /EAI_AGAIN/i,
  /UND_ERR_CONNECT_TIMEOUT/i,
];

const runDeploy = () =>
  new Promise((resolve) => {
    const child = spawn(
      "pnpm",
      ["exec", "wrangler", "deploy", "--minify", "--env="],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("close", (code, signal) => {
      resolve({
        code: code ?? 1,
        signal,
        output,
      });
    });
  });

const isTransientFailure = (output) =>
  TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(output));

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const result = await runDeploy();

  if (result.code === 0) {
    process.exit(0);
  }

  if (result.signal) {
    process.kill(process.pid, result.signal);
  }

  const shouldRetry =
    attempt < MAX_ATTEMPTS && isTransientFailure(result.output);

  if (!shouldRetry) {
    process.exit(result.code);
  }

  const delayMs = BASE_DELAY_MS * attempt;
  console.error(
    `[deploy-worker] transient network failure detected; retrying in ${delayMs}ms (${attempt + 1}/${MAX_ATTEMPTS})`,
  );
  await sleep(delayMs);
}
