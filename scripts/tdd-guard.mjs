#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import process from "node:process";

const SOURCE_ROOTS = [
  "apps/api/src/",
  "apps/web/src/",
  "packages/shared-api-contracts/src/",
];

const BYPASS_FLAG = process.env.TDD_GUARD_BYPASS;
if (BYPASS_FLAG === "1" || BYPASS_FLAG?.toLowerCase() === "true") {
  console.log("[tdd:guard] bypass enabled.");
  process.exit(0);
}

const runGit = (args) => {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
};

const tryRunGit = (args) => {
  try {
    return runGit(args);
  } catch {
    return null;
  }
};

const hasRef = (ref) => {
  return tryRunGit(["rev-parse", "--verify", "--quiet", ref]) !== null;
};

const resolveBaseRef = () => {
  const explicitBase = process.env.TDD_GUARD_BASE?.trim();
  if (explicitBase) {
    return explicitBase;
  }

  const githubBase = process.env.GITHUB_BASE_REF?.trim();
  if (githubBase) {
    const originCandidate = `origin/${githubBase}`;
    if (hasRef(originCandidate)) {
      return originCandidate;
    }
    if (hasRef(githubBase)) {
      return githubBase;
    }
  }

  const defaultCandidates = ["origin/main", "main", "origin/master", "master"];
  for (const candidate of defaultCandidates) {
    if (hasRef(candidate)) {
      return candidate;
    }
  }

  return "HEAD~1";
};

const resolveMergeBase = (baseRef) => {
  const mergeBase = tryRunGit(["merge-base", "HEAD", baseRef]);
  if (mergeBase) {
    return mergeBase;
  }

  const previousCommit = tryRunGit(["rev-parse", "HEAD~1"]);
  if (previousCommit) {
    return previousCommit;
  }

  return runGit(["rev-parse", "HEAD"]);
};

const isTestFile = (filePath) => {
  const normalized = filePath.toLowerCase();
  return (
    normalized.includes("/tests/") ||
    normalized.includes("/__tests__/") ||
    normalized.endsWith(".test.ts") ||
    normalized.endsWith(".test.tsx") ||
    normalized.endsWith(".spec.ts") ||
    normalized.endsWith(".spec.tsx")
  );
};

const isSourceFile = (filePath) => {
  const normalized = filePath.replaceAll("\\", "/");
  if (!SOURCE_ROOTS.some((root) => normalized.startsWith(root))) {
    return false;
  }

  if (!/\.(ts|tsx)$/.test(normalized)) {
    return false;
  }

  return !isTestFile(normalized);
};

const baseRef = resolveBaseRef();
const mergeBase = resolveMergeBase(baseRef);
const changedOutput =
  tryRunGit(["diff", "--name-only", "--diff-filter=ACMR", `${mergeBase}...HEAD`]) ?? "";

const changedFiles = changedOutput
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

if (changedFiles.length === 0) {
  console.log("[tdd:guard] no changed files detected.");
  process.exit(0);
}

const changedSourceFiles = changedFiles.filter(isSourceFile);
if (changedSourceFiles.length === 0) {
  console.log("[tdd:guard] source changes not detected.");
  process.exit(0);
}

const changedTestFiles = changedFiles.filter(isTestFile);
if (changedTestFiles.length > 0) {
  console.log(
    `[tdd:guard] OK (${changedSourceFiles.length} source / ${changedTestFiles.length} test).`,
  );
  process.exit(0);
}

console.error("[tdd:guard] source changes detected without test changes.");
console.error("[tdd:guard] changed source files:");
for (const sourceFile of changedSourceFiles) {
  console.error(`  - ${sourceFile}`);
}
console.error(
  "[tdd:guard] add or update at least one unit/integration/e2e test in the same change set.",
);
process.exit(1);
