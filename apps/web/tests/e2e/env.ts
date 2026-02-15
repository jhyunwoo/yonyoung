import fs from "node:fs";
import path from "node:path";

const APP_ROOT_DIR = path.resolve(__dirname, "..", "..");
const E2E_DIR = __dirname;

const E2E_ENV_LOCAL_PATH = path.resolve(E2E_DIR, ".env.e2e.local");
const E2E_ENV_PATH = path.resolve(E2E_DIR, ".env.e2e");
const E2E_ENV_EXAMPLE_PATH = path.resolve(E2E_DIR, ".env.e2e.example");

const NEXT_ENV_FALLBACK_PATHS = [
  path.resolve(APP_ROOT_DIR, ".env.local"),
  path.resolve(APP_ROOT_DIR, ".env.development.local"),
  path.resolve(APP_ROOT_DIR, ".env.development"),
  path.resolve(APP_ROOT_DIR, ".env"),
];

const parseEnvLine = (
  line: string,
): {
  key: string;
  value: string;
} | null => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const withoutExport = trimmed.startsWith("export ")
    ? trimmed.slice("export ".length).trim()
    : trimmed;
  const delimiterIndex = withoutExport.indexOf("=");
  if (delimiterIndex <= 0) {
    return null;
  }

  const key = withoutExport.slice(0, delimiterIndex).trim();
  const isValidKey = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
  if (!isValidKey) {
    return null;
  }

  let value = withoutExport.slice(delimiterIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/, "").trim();
  }

  return {
    key,
    value,
  };
};

const loadEnvFile = (filePath: string): boolean => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const rawContent = fs.readFileSync(filePath, "utf8");
  const lines = rawContent.split(/\r?\n/);

  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }

    // CLI/CI에서 주입된 값이 항상 우선한다.
    if (process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
    }
  }

  return true;
};

export const loadE2eEnv = (): string[] => {
  const loadedFiles: string[] = [];
  const envPaths = [E2E_ENV_LOCAL_PATH, E2E_ENV_PATH, ...NEXT_ENV_FALLBACK_PATHS];

  for (const envPath of envPaths) {
    if (loadEnvFile(envPath)) {
      loadedFiles.push(envPath);
    }
  }

  return loadedFiles;
};

export const readE2eEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`${key} 환경변수가 필요합니다.`);
};

export type E2ESuiteMode = "smoke" | "full";
export type E2ERoleMatrixMode = "core" | "all";

const normalizeTextValue = (value: string | undefined): string =>
  (value ?? "").trim().toLowerCase();

export const readE2eSuiteMode = (): E2ESuiteMode => {
  const rawValue = normalizeTextValue(process.env.E2E_SUITE_MODE);
  return rawValue === "full" ? "full" : "smoke";
};

export const readE2eRoleMatrixMode = (): E2ERoleMatrixMode => {
  const rawValue = normalizeTextValue(process.env.E2E_ROLE_MATRIX);
  return rawValue === "all" ? "all" : "core";
};

export const requireE2eEnv = (keys: string[]): Record<string, string> => {
  const missingKeys = keys.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.length === 0;
  });

  if (missingKeys.length > 0) {
    const message = [
      `E2E 필수 환경변수가 누락되었습니다: ${missingKeys.join(", ")}`,
      `해결 방법: cp tests/e2e/.env.e2e.example tests/e2e/.env.e2e`,
      `그리고 /Users/jhyunwoo/projects/yonyoung/apps/web/tests/e2e/.env.e2e 파일에 값을 채워 주세요.`,
      `샘플 파일: ${E2E_ENV_EXAMPLE_PATH}`,
    ].join("\n");

    throw new Error(message);
  }

  const result: Record<string, string> = {};
  for (const key of keys) {
    result[key] = process.env[key] as string;
  }
  return result;
};
