#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { formatMs, parseArgs, renderTable, toBoolean } from "./perf-utils.mjs";

const args = parseArgs(process.argv.slice(2));

const printEndpointTable = (endpointSummaries) => {
  const headers = ["Endpoint", "Count", "P50", "P95", "P99"];
  const rows = endpointSummaries.map((entry) => [
    entry.endpoint,
    String(entry.count),
    formatMs(entry.p50Ms),
    formatMs(entry.p95Ms),
    formatMs(entry.p99Ms),
  ]);

  console.log("");
  console.log("API Endpoint Latency");
  for (const line of renderTable(headers, rows)) {
    console.log(line);
  }
};

const baseUrl = (args.baseUrl ?? process.env.LOAD_BASE_URL ?? "http://127.0.0.1:8787").replace(
  /\/+$/,
  "",
);
const endpoints = (
  args.endpoints ?? process.env.LOAD_ENDPOINTS ?? "/health,/api/public/activities"
)
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const totalRequests = Number.parseInt(args.requests ?? process.env.LOAD_REQUESTS ?? "120", 10);
const concurrency = Number.parseInt(args.concurrency ?? process.env.LOAD_CONCURRENCY ?? "8", 10);
const warmupRequests = Number.parseInt(
  args.warmupRequests ?? process.env.LOAD_WARMUP_REQUESTS ?? "20",
  10,
);

const p95GlobalTargetMs = Number.parseFloat(args.p95 ?? process.env.LOAD_P95_TARGET_MS ?? "300");
const p95CachedTargetMs = Number.parseFloat(
  args.p95Cached ?? process.env.LOAD_P95_CACHED_TARGET_MS ?? "150",
);
const maxErrorRate = Number.parseFloat(args.max5xx ?? process.env.LOAD_MAX_5XX_RATE ?? "0.001");
const outputPath = args.outputPath ?? process.env.LOAD_OUTPUT_PATH ?? "";
const shouldPrintJson = toBoolean(args.printJson, true);
const shouldPrintTable = toBoolean(args.printTable, true);

if (!Number.isFinite(totalRequests) || totalRequests <= 0) {
  throw new Error("totalRequests must be a positive integer");
}
if (!Number.isFinite(concurrency) || concurrency <= 0) {
  throw new Error("concurrency must be a positive integer");
}
if (endpoints.length === 0) {
  throw new Error("At least one endpoint is required");
}
if (!Number.isFinite(warmupRequests) || warmupRequests < 0) {
  throw new Error("warmupRequests must be 0 or a positive integer");
}

const pickEndpoint = (index) => endpoints[index % endpoints.length];

const percentile = (values, ratio) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const targetIndex = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[targetIndex] ?? 0;
};

const globalLatencies = [];
const endpointLatencies = new Map(endpoints.map((endpoint) => [endpoint, []]));
const statusCounts = new Map();
let uncaughtErrors = 0;

let cursor = 0;
const performRequest = async (requestIndex, recordMetrics) => {
  const endpoint = pickEndpoint(requestIndex);
  const url = `${baseUrl}${endpoint}`;
  const requestStartedAt = performance.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json,text/plain,*/*",
      },
    });

    const elapsedMs = performance.now() - requestStartedAt;
    if (recordMetrics) {
      globalLatencies.push(elapsedMs);
      endpointLatencies.get(endpoint)?.push(elapsedMs);
      statusCounts.set(response.status, (statusCounts.get(response.status) ?? 0) + 1);
    }

    await response.arrayBuffer();
  } catch {
    if (recordMetrics) {
      uncaughtErrors += 1;
    }
  }
};

for (let index = 0; index < warmupRequests; index += 1) {
  await performRequest(index, false);
}

const startedAt = performance.now();
const worker = async () => {
  while (cursor < totalRequests) {
    const requestIndex = cursor;
    cursor += 1;
    await performRequest(requestIndex, true);
  }
};

await Promise.all(Array.from({ length: Math.min(concurrency, totalRequests) }, () => worker()));
const totalDurationMs = performance.now() - startedAt;
const totalStatusCount = Array.from(statusCounts.values()).reduce((acc, value) => acc + value, 0);
const totalCompleted = totalStatusCount + uncaughtErrors;

const globalP95 = percentile(globalLatencies, 0.95);
const globalP99 = percentile(globalLatencies, 0.99);

const endpointSummaries = endpoints.map((endpoint) => {
  const values = endpointLatencies.get(endpoint) ?? [];
  return {
    endpoint,
    count: values.length,
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
  };
});

const statusSummary = Object.fromEntries(
  [...statusCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([status, count]) => [status, count]),
);

const fiveXXCount = [...statusCounts.entries()]
  .filter(([status]) => status >= 500)
  .reduce((acc, [, count]) => acc + count, 0);
const fiveXXRate = totalCompleted > 0 ? fiveXXCount / totalCompleted : 0;

const cachedEndpoints = endpointSummaries.filter(
  (entry) => entry.endpoint === "/health" || entry.endpoint.startsWith("/api/public/"),
);
const cachedP95 = cachedEndpoints.length ? Math.max(...cachedEndpoints.map((entry) => entry.p95)) : 0;

const result = {
  baseUrl,
  endpoints,
  totalRequests,
  warmupRequests,
  concurrency,
  totalCompleted,
  totalDurationMs: Number(totalDurationMs.toFixed(2)),
  requestsPerSecond: Number(((totalCompleted * 1000) / totalDurationMs).toFixed(2)),
  latencies: {
    p50Ms: Number(percentile(globalLatencies, 0.5).toFixed(2)),
    p95Ms: Number(globalP95.toFixed(2)),
    p99Ms: Number(globalP99.toFixed(2)),
  },
  endpointSummaries: endpointSummaries.map((entry) => ({
    endpoint: entry.endpoint,
    count: entry.count,
    p50Ms: Number(entry.p50.toFixed(2)),
    p95Ms: Number(entry.p95.toFixed(2)),
    p99Ms: Number(entry.p99.toFixed(2)),
  })),
  statusSummary,
  uncaughtErrors,
  errorBudget: {
    fiveXXRate,
    maxAllowed: maxErrorRate,
  },
  targets: {
    globalP95Ms: p95GlobalTargetMs,
    cachedP95Ms: p95CachedTargetMs,
  },
};

if (outputPath) {
  const resolvedOutputPath = path.resolve(outputPath);
  await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await fs.writeFile(resolvedOutputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

if (shouldPrintTable) {
  printEndpointTable(result.endpointSummaries);
  console.log("");
  console.log("API Global Metrics");
  console.log(`- RPS: ${result.requestsPerSecond}`);
  console.log(`- P50: ${formatMs(result.latencies.p50Ms)}`);
  console.log(`- P95: ${formatMs(result.latencies.p95Ms)}`);
  console.log(`- P99: ${formatMs(result.latencies.p99Ms)}`);
  console.log(`- 5xx rate: ${(result.errorBudget.fiveXXRate * 100).toFixed(3)}%`);
  console.log(`- uncaught errors: ${result.uncaughtErrors}`);
  if (outputPath) {
    console.log(`- summary file: ${path.resolve(outputPath)}`);
  }
}

if (shouldPrintJson) {
  console.log(JSON.stringify(result, null, 2));
}

const failedTargets = [];
if (globalP95 > p95GlobalTargetMs) {
  failedTargets.push(`global p95 ${globalP95.toFixed(2)}ms > ${p95GlobalTargetMs}ms`);
}
if (cachedP95 > p95CachedTargetMs) {
  failedTargets.push(`cached/public p95 ${cachedP95.toFixed(2)}ms > ${p95CachedTargetMs}ms`);
}
if (fiveXXRate > maxErrorRate || uncaughtErrors > 0) {
  failedTargets.push(
    `5xx rate ${(fiveXXRate * 100).toFixed(3)}% exceeded ${(maxErrorRate * 100).toFixed(3)}% or uncaught errors present`,
  );
}

if (failedTargets.length > 0) {
  console.error("Load test gate failed:");
  for (const entry of failedTargets) {
    console.error(`- ${entry}`);
  }
  process.exitCode = 1;
}
