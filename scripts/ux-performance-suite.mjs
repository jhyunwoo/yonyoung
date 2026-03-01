#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { parseArgs, renderTable, runCommand, toBoolean } from "./perf-utils.mjs";

const args = parseArgs(process.argv.slice(2));

const rootDir = process.cwd();
const artifactsDir = path.resolve(
  args.artifactsDir ?? process.env.UX_PERF_ARTIFACTS_DIR ?? path.join(rootDir, "artifacts/performance"),
);
const webSummaryPath = path.join(artifactsDir, "web-lighthouse-summary.json");
const apiSummaryPath = path.join(artifactsDir, "api-load-summary.json");

const webBaseUrl = (args.webBaseUrl ?? process.env.LIGHTHOUSE_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/+$/,
  "",
);
const apiBaseUrl = (args.apiBaseUrl ?? process.env.LOAD_BASE_URL ?? "http://127.0.0.1:8787").replace(
  /\/+$/,
  "",
);
const routes =
  args.routes ?? process.env.LIGHTHOUSE_ROUTES ?? "/,/archive/records,/archive/exhibitions,/about";
const endpoints =
  args.endpoints ??
  process.env.LOAD_ENDPOINTS ??
  "/health,/api/public/activities,/api/public/exhibitions,/api/public/notices,/api/public/photographers";
const requests = args.requests ?? process.env.LOAD_REQUESTS ?? "240";
const concurrency = args.concurrency ?? process.env.LOAD_CONCURRENCY ?? "12";
const warmupRequests = args.warmupRequests ?? process.env.LOAD_WARMUP_REQUESTS ?? "40";

const skipWeb = toBoolean(args.skipWeb, false);
const skipApi = toBoolean(args.skipApi, false);

await fs.mkdir(artifactsDir, { recursive: true });

const failures = [];

if (!skipWeb) {
  const webExitCode = await runCommand("node", [
    "scripts/lighthouse-runner.mjs",
    `--baseUrl=${webBaseUrl}`,
    `--routes=${routes}`,
    `--summaryPath=${webSummaryPath}`,
    "--printJson=false",
    "--printTable=false",
  ]);

  if (webExitCode !== 0) {
    failures.push("web");
  }
}

if (!skipApi) {
  const apiExitCode = await runCommand("node", [
    "scripts/api-load-test.mjs",
    `--baseUrl=${apiBaseUrl}`,
    `--endpoints=${endpoints}`,
    `--requests=${requests}`,
    `--concurrency=${concurrency}`,
    `--warmupRequests=${warmupRequests}`,
    `--outputPath=${apiSummaryPath}`,
    "--printJson=false",
    "--printTable=false",
  ]);

  if (apiExitCode !== 0) {
    failures.push("api");
  }
}

const printWebSummary = async () => {
  if (skipWeb) {
    return;
  }

  const raw = await fs.readFile(webSummaryPath, "utf8");
  const summary = JSON.parse(raw);
  const rows = summary.map((item) => ({
    route: item.route,
    score: typeof item.performanceScore === "number" ? Math.round(item.performanceScore * 100) : null,
    lcp: typeof item.lcp === "number" ? item.lcp.toFixed(0) : "-",
    inp: typeof item.inp === "number" ? item.inp.toFixed(0) : "-",
    cls: typeof item.cls === "number" ? item.cls.toFixed(3) : "-",
    fcp: typeof item.fcp === "number" ? item.fcp.toFixed(0) : "-",
    ttfb: typeof item.ttfb === "number" ? item.ttfb.toFixed(0) : "-",
  }));

  const headers = ["Route", "Score", "LCP", "INP", "CLS", "FCP", "TTFB"];
  const tableRows = rows.map((entry) => [
    entry.route,
    entry.score ?? "-",
    `${entry.lcp}ms`,
    `${entry.inp}ms`,
    entry.cls,
    `${entry.fcp}ms`,
    `${entry.ttfb}ms`,
  ]);

  console.log("");
  console.log("=== Web UX Performance (Core Web Vitals) ===");
  for (const line of renderTable(headers, tableRows)) {
    console.log(line);
  }
  console.log(`Artifacts: ${webSummaryPath}`);
};

const printApiSummary = async () => {
  if (skipApi) {
    return;
  }

  const raw = await fs.readFile(apiSummaryPath, "utf8");
  const summary = JSON.parse(raw);
  const headers = ["Endpoint", "Count", "P50", "P95", "P99"];
  const tableRows = summary.endpointSummaries.map((entry) => [
    entry.endpoint,
    entry.count,
    `${entry.p50Ms.toFixed(2)}ms`,
    `${entry.p95Ms.toFixed(2)}ms`,
    `${entry.p99Ms.toFixed(2)}ms`,
  ]);

  console.log("");
  console.log("=== API UX Performance (Latency/Error Budget) ===");
  for (const line of renderTable(headers, tableRows)) {
    console.log(line);
  }
  console.log("");
  console.log(`Global P95: ${summary.latencies.p95Ms.toFixed(2)}ms`);
  console.log(`Global P99: ${summary.latencies.p99Ms.toFixed(2)}ms`);
  console.log(`RPS: ${summary.requestsPerSecond}`);
  console.log(`5xx rate: ${(summary.errorBudget.fiveXXRate * 100).toFixed(3)}%`);
  console.log(`Uncaught errors: ${summary.uncaughtErrors}`);
  console.log(`Artifacts: ${apiSummaryPath}`);
};

await printWebSummary().catch((error) => {
  failures.push("web:summary");
  console.error(`Failed to print web summary: ${error instanceof Error ? error.message : String(error)}`);
});
await printApiSummary().catch((error) => {
  failures.push("api:summary");
  console.error(`Failed to print api summary: ${error instanceof Error ? error.message : String(error)}`);
});

if (failures.length > 0) {
  console.error("");
  console.error(`UX performance suite failed: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("");
  console.log("UX performance suite passed.");
}
