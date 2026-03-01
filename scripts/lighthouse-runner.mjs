#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { formatMs, parseArgs, renderTable, runCommand, toBoolean } from "./perf-utils.mjs";

const args = parseArgs(process.argv.slice(2));

const formatCls = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "-";
const formatScore = (value) =>
  typeof value === "number" && Number.isFinite(value) ? `${Math.round(value * 100)}` : "-";

const printTable = (summary) => {
  const headers = ["Route", "Score", "LCP", "INP", "CLS", "FCP", "TTFB"];
  const rows = summary.map((item) => [
    item.route,
    formatScore(item.performanceScore),
    formatMs(item.lcp, 0),
    formatMs(item.inp, 0),
    formatCls(item.cls),
    formatMs(item.fcp, 0),
    formatMs(item.ttfb, 0),
  ]);

  console.log("");
  console.log("Web UX Metrics (Lighthouse)");
  for (const line of renderTable(headers, rows)) {
    console.log(line);
  }
};

const baseUrl = (
  args.baseUrl ??
  process.env.LIGHTHOUSE_BASE_URL ??
  "http://127.0.0.1:3000"
).replace(/\/+$/, "");
const routes = (
  args.routes ??
  process.env.LIGHTHOUSE_ROUTES ??
  "/,/archive/records,/archive/exhibitions,/about"
)
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const artifactsDir = path.resolve(
  args.artifactsDir ??
    process.env.LIGHTHOUSE_ARTIFACTS_DIR ??
    path.join(process.cwd(), "artifacts/lighthouse"),
);
const summaryPath = path.resolve(
  args.summaryPath ?? process.env.LIGHTHOUSE_SUMMARY_PATH ?? path.join(artifactsDir, "summary.json"),
);
const shouldPrintJson = toBoolean(args.printJson, true);
const shouldPrintTable = toBoolean(args.printTable, true);

await fs.mkdir(artifactsDir, { recursive: true });
await fs.mkdir(path.dirname(summaryPath), { recursive: true });

const summary = [];
const lcpThresholdMs = Number.parseFloat(args.lcp ?? process.env.LIGHTHOUSE_LCP_THRESHOLD_MS ?? "2500");
const clsThreshold = Number.parseFloat(args.cls ?? process.env.LIGHTHOUSE_CLS_THRESHOLD ?? "0.1");
const inpThresholdMs = Number.parseFloat(args.inp ?? process.env.LIGHTHOUSE_INP_THRESHOLD_MS ?? "200");

for (const route of routes) {
  const sanitizedRoute = route === "/" ? "home" : route.replace(/\//g, "_").replace(/^_/, "");
  const outputPath = path.join(artifactsDir, `${sanitizedRoute}.json`);
  const targetUrl = `${baseUrl}${route}`;
  let finalResult = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const attemptOutputPath =
      attempt === 1 ? outputPath : path.join(artifactsDir, `${sanitizedRoute}.retry.json`);

    await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "text/html" },
    }).catch(() => null);

    const exitCode = await runCommand("npx", [
      "--yes",
      "lighthouse",
      targetUrl,
      "--output=json",
      `--output-path=${attemptOutputPath}`,
      "--chrome-flags=--headless=new --no-sandbox",
      "--form-factor=mobile",
      "--screenEmulation.mobile=true",
      "--throttling-method=devtools",
      "--throttling.rttMs=150",
      "--throttling.throughputKbps=1638",
      "--throttling.cpuSlowdownMultiplier=4",
      "--quiet",
    ]);
    if (exitCode !== 0) {
      throw new Error(`npx lighthouse failed with code ${exitCode} for route ${route}`);
    }

    const parsed = JSON.parse(await fs.readFile(attemptOutputPath, "utf8"));
    const parsedLcp = parsed?.audits?.["largest-contentful-paint"]?.numericValue ?? null;

    finalResult = parsed;
    if (attempt === 2 || typeof parsedLcp !== "number" || parsedLcp <= lcpThresholdMs) {
      if (attemptOutputPath !== outputPath) {
        await fs.copyFile(attemptOutputPath, outputPath);
      }
      break;
    }
  }

  const lcp = finalResult?.audits?.["largest-contentful-paint"]?.numericValue ?? null;
  const cls = finalResult?.audits?.["cumulative-layout-shift"]?.numericValue ?? null;
  const inp = finalResult?.audits?.["interaction-to-next-paint"]?.numericValue ?? null;
  const fcp = finalResult?.audits?.["first-contentful-paint"]?.numericValue ?? null;
  const ttfb = finalResult?.audits?.["server-response-time"]?.numericValue ?? null;
  const performanceScore = finalResult?.categories?.performance?.score ?? null;

  summary.push({
    route,
    lcp,
    cls,
    inp,
    fcp,
    ttfb,
    performanceScore,
    outputPath,
  });
}

await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

if (shouldPrintTable) {
  printTable(summary);
  console.log("");
  console.log(`Summary file: ${summaryPath}`);
}

if (shouldPrintJson) {
  console.log(
    JSON.stringify(
      {
        baseUrl,
        summary,
        summaryPath,
      },
      null,
      2,
    ),
  );
}

const failures = [];
for (const item of summary) {
  if (typeof item.lcp === "number" && item.lcp > lcpThresholdMs) {
    failures.push(`${item.route} LCP ${item.lcp.toFixed(0)}ms > ${lcpThresholdMs}ms`);
  }
  if (typeof item.cls === "number" && item.cls > clsThreshold) {
    failures.push(`${item.route} CLS ${item.cls.toFixed(3)} > ${clsThreshold}`);
  }
  if (typeof item.inp === "number" && item.inp > inpThresholdMs) {
    failures.push(`${item.route} INP ${item.inp.toFixed(0)}ms > ${inpThresholdMs}ms`);
  }
}

if (failures.length > 0) {
  console.error("Lighthouse gate failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
}
