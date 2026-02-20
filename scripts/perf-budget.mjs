#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const webDir = path.join(rootDir, "apps/web");
const nextDir = path.join(webDir, ".next");
const budgetPath = path.join(webDir, "perf-budget.config.json");
const args = new Set(process.argv.slice(2));
const shouldWriteBaseline = args.has("--write-baseline");

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const safeReadJson = async (filePath) => {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
};

const normalizeToNextAssetPath = (value) => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  if (value.startsWith("/_next/")) {
    return value.slice("/_next/".length);
  }

  return value.replace(/^\//, "");
};

const toAssetSize = async (assetPath) => {
  const normalized = normalizeToNextAssetPath(assetPath);
  if (!normalized) {
    return 0;
  }
  const fullPath = path.join(nextDir, normalized);
  try {
    const stat = await fs.stat(fullPath);
    return stat.size;
  } catch {
    return 0;
  }
};

const resolveRouteAssets = async () => {
  const buildManifest = await safeReadJson(path.join(nextDir, "build-manifest.json"));
  const appBuildManifest = await safeReadJson(path.join(nextDir, "app-build-manifest.json"));

  if (!buildManifest && !appBuildManifest) {
    throw new Error("Build manifest not found. Run `pnpm web:build` first.");
  }

  const routeToFiles = new Map();

  const addEntries = (entries) => {
    if (!entries || typeof entries !== "object") {
      return;
    }

    for (const [routeKey, files] of Object.entries(entries)) {
      if (!Array.isArray(files)) {
        continue;
      }

      const jsFiles = files.filter((file) => typeof file === "string" && file.endsWith(".js"));
      const existing = routeToFiles.get(routeKey) ?? [];
      routeToFiles.set(routeKey, Array.from(new Set([...existing, ...jsFiles])));
    }
  };

  addEntries(buildManifest?.pages);
  addEntries(appBuildManifest?.pages);

  return {
    routeToFiles,
    buildManifest,
  };
};

const matchRouteFiles = (routeToFiles, candidates) => {
  for (const candidate of candidates) {
    if (routeToFiles.has(candidate)) {
      return routeToFiles.get(candidate) ?? [];
    }
  }

  for (const [routeKey, files] of routeToFiles.entries()) {
    if (candidates.some((candidate) => routeKey.includes(candidate))) {
      return files;
    }
  }

  return [];
};

const normalizeBudgetRouteCandidate = (candidate) => {
  if (typeof candidate !== "string" || candidate.length === 0) {
    return "/";
  }

  if (candidate.startsWith("/(")) {
    const withoutGroups = candidate
      .replace(/\/\([^/]+\)/g, "")
      .replace(/\/page$/, "");
    return withoutGroups || "/";
  }

  return candidate;
};

const parseRouteHtmlFiles = async (routePath) => {
  const normalizedRoute = normalizeBudgetRouteCandidate(routePath);
  const relative = normalizedRoute === "/" ? "index.html" : `${normalizedRoute.replace(/^\//, "")}.html`;
  const htmlPath = path.join(nextDir, "server", "app", relative);
  let html = "";
  try {
    html = await fs.readFile(htmlPath, "utf8");
  } catch {
    return [];
  }

  const scripts = new Set();
  const regex = /(?:<script[^>]*\bsrc|<link[^>]*\bas=["']script["'][^>]*\bhref)=["']([^"']+\.js(?:\?[^"']*)?)["']/gi;
  let match;
  while ((match = regex.exec(html))) {
    const source = match[1];
    const normalized = normalizeToNextAssetPath(source?.split("?")[0] ?? "");
    if (!normalized || !normalized.endsWith(".js")) {
      continue;
    }
    if (!normalized.startsWith("static/")) {
      continue;
    }
    scripts.add(normalized);
  }

  return Array.from(scripts);
};

const resolveRouteFiles = async (routeToFiles, candidates) => {
  const manifestFiles = matchRouteFiles(routeToFiles, candidates);
  if (manifestFiles.length > 0) {
    return manifestFiles;
  }

  const merged = new Set();
  for (const candidate of candidates) {
    const htmlFiles = await parseRouteHtmlFiles(candidate);
    for (const file of htmlFiles) {
      merged.add(file);
    }
  }

  return Array.from(merged);
};

const calculateBytes = async (files) => {
  let total = 0;
  for (const file of files) {
    total += await toAssetSize(file);
  }
  return total;
};

const gatherThirdPartyScripts = async () => {
  const sourceRoot = path.join(webDir, "src");
  const urls = new Set();

  const walk = async (dirPath) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        continue;
      }

      const source = await fs.readFile(entryPath, "utf8");
      const regex = /<\s*Script[^>]*\bsrc=["'](https?:\/\/[^"']+)["']|<\s*script[^>]*\bsrc=["'](https?:\/\/[^"']+)["']/gi;
      let match;
      while ((match = regex.exec(source))) {
        const url = match[1] ?? match[2];
        if (url) {
          urls.add(url);
        }
      }
    }
  };

  await walk(sourceRoot);

  const entries = [];
  for (const url of urls) {
    let bytes = 0;
    try {
      const response = await fetch(url, { method: "HEAD" });
      const length = response.headers.get("content-length");
      if (length) {
        bytes = Number.parseInt(length, 10) || 0;
      }
    } catch {
      bytes = 0;
    }

    entries.push({
      url,
      host: new URL(url).host,
      bytes,
    });
  }

  return entries;
};

const budgets = await safeReadJson(budgetPath);
if (!budgets) {
  throw new Error(`Budget config missing: ${budgetPath}`);
}

const { routeToFiles, buildManifest } = await resolveRouteAssets();
const configuredSharedFiles = Array.isArray(budgets.shared?.files)
  ? budgets.shared.files
      .map(normalizeToNextAssetPath)
      .filter((value) => typeof value === "string")
  : [];
const defaultSharedFiles = [
  ...(Array.isArray(buildManifest?.rootMainFiles) ? buildManifest.rootMainFiles : []),
  ...(Array.isArray(buildManifest?.polyfillFiles) ? buildManifest.polyfillFiles : []),
]
  .map(normalizeToNextAssetPath)
  .filter((value) => typeof value === "string");
const existingConfiguredSharedFiles = [];
for (const assetFile of configuredSharedFiles) {
  if ((await toAssetSize(assetFile)) > 0) {
    existingConfiguredSharedFiles.push(assetFile);
  }
}
const sharedFiles =
  existingConfiguredSharedFiles.length > 0 ? existingConfiguredSharedFiles : defaultSharedFiles;
const sharedBytes = await calculateBytes(sharedFiles);

const routeResults = [];
for (const routeBudget of budgets.routes ?? []) {
  const files = await resolveRouteFiles(routeToFiles, routeBudget.routeKeyCandidates ?? []);
  const bytes = await calculateBytes(files);
  routeResults.push({
    ...routeBudget,
    files,
    bytes,
  });
}

const thirdParty = await gatherThirdPartyScripts();
const thirdPartyBytes = thirdParty.reduce((acc, item) => acc + item.bytes, 0);

const applyBudget = (label, actual, budget) => {
  const baseline = Number(budget.baselineBytes ?? 0);
  const maxRegressionPercent = Number(budget.maxRegressionPercent ?? 0);
  const allowed = Math.round(baseline * (1 + maxRegressionPercent / 100));

  return {
    label,
    actual,
    baseline,
    maxRegressionPercent,
    allowed,
    passed: baseline > 0 ? actual <= allowed : false,
  };
};

const sharedBudget = applyBudget("shared", sharedBytes, budgets.shared ?? {});
const routeBudgets = routeResults.map((route) =>
  applyBudget(route.name, route.bytes, route),
);

const thirdPartyBudget = {
  count: thirdParty.length,
  bytes: thirdPartyBytes,
  maxCount: budgets.thirdParty?.maxCount ?? 0,
  maxBytes: budgets.thirdParty?.maxBytes ?? 0,
  approvedHosts: budgets.thirdParty?.approvedHosts ?? [],
};

if (shouldWriteBaseline) {
  budgets.shared.baselineBytes = sharedBytes;
  for (const route of routeResults) {
    const target = (budgets.routes ?? []).find((entry) => entry.name === route.name);
    if (target) {
      target.baselineBytes = route.bytes;
    }
  }

  await fs.writeFile(budgetPath, `${JSON.stringify(budgets, null, 2)}\n`, "utf8");
}

const report = {
  shared: {
    files: sharedFiles,
    bytes: sharedBytes,
    budget: sharedBudget,
  },
  routes: routeResults.map((route) => {
    const budget = routeBudgets.find((item) => item.label === route.name);
    return {
      name: route.name,
      routeKeyCandidates: route.routeKeyCandidates,
      files: route.files,
      bytes: route.bytes,
      budget,
    };
  }),
  thirdParty: {
    entries: thirdParty,
    budget: thirdPartyBudget,
  },
};

console.log(JSON.stringify(report, null, 2));

if (shouldWriteBaseline) {
  console.log(`Updated perf baselines: ${budgetPath}`);
  process.exit(0);
}

const failures = [];

if (!sharedBudget.passed) {
  failures.push(
    `shared JS budget exceeded: ${sharedBudget.actual} > ${sharedBudget.allowed} bytes`,
  );
}

for (const budget of routeBudgets) {
  if (!budget.passed) {
    failures.push(
      `route ${budget.label} budget exceeded: ${budget.actual} > ${budget.allowed} bytes`,
    );
  }
}

const disallowedHosts = thirdParty
  .map((item) => item.host)
  .filter(
    (host, index, array) =>
      array.indexOf(host) === index &&
      !(thirdPartyBudget.approvedHosts ?? []).includes(host),
  );
if (thirdPartyBudget.count > thirdPartyBudget.maxCount) {
  failures.push(
    `third-party script count exceeded: ${thirdPartyBudget.count} > ${thirdPartyBudget.maxCount}`,
  );
}
if (thirdPartyBudget.bytes > thirdPartyBudget.maxBytes) {
  failures.push(
    `third-party script bytes exceeded: ${thirdPartyBudget.bytes} > ${thirdPartyBudget.maxBytes}`,
  );
}
if (disallowedHosts.length > 0) {
  failures.push(`unapproved third-party hosts detected: ${disallowedHosts.join(", ")}`);
}

if (!shouldWriteBaseline && (sharedBudget.baseline <= 0 || routeBudgets.some((entry) => entry.baseline <= 0))) {
  failures.push("Perf baselines are missing. Run `node scripts/perf-budget.mjs --write-baseline` after a clean build.");
}

if (failures.length > 0) {
  console.error("Perf budget gate failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
}
