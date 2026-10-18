import "server-only";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

export type DashboardRuntimeProjectMeta = {
  version: string;
  updatedAt: number | null;
};

export type DashboardRuntimeMeta = {
  web: DashboardRuntimeProjectMeta;
  api: DashboardRuntimeProjectMeta;
};

const readPackageVersion = async (packageJsonPath: string): Promise<string> => {
  try {
    const packageJson = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(packageJson) as { version?: unknown };

    return typeof parsed.version === "string" && parsed.version.trim().length > 0
      ? parsed.version.trim()
      : "unknown";
  } catch {
    return "unknown";
  }
};

/** 모노레포라 저장소 전체가 아니라 프로젝트 디렉터리(`-- .`)의 마지막 커밋 시각을 읽는다. */
const readGitUpdatedAt = async (projectRoot: string): Promise<number | null> => {
  try {
    const { stdout } = await execFileAsync("git", [
      "-C",
      projectRoot,
      "log",
      "-1",
      "--format=%cI",
      "--",
      ".",
    ]);
    const timestampMs = Date.parse(stdout.trim());

    return Number.isFinite(timestampMs) ? timestampMs : null;
  } catch {
    return null;
  }
};

const readFileUpdatedAt = async (filePath: string): Promise<number | null> => {
  try {
    const packageStat = await stat(filePath);
    return Number.isFinite(packageStat.mtimeMs) ? packageStat.mtimeMs : null;
  } catch {
    return null;
  }
};

const readProjectMeta = async (
  projectRoot: string,
): Promise<DashboardRuntimeProjectMeta> => {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const [version, gitUpdatedAt, fileUpdatedAt] = await Promise.all([
    readPackageVersion(packageJsonPath),
    readGitUpdatedAt(projectRoot),
    readFileUpdatedAt(packageJsonPath),
  ]);

  return {
    version,
    updatedAt: gitUpdatedAt ?? fileUpdatedAt,
  };
};

const readRuntimeMeta = async (): Promise<DashboardRuntimeMeta> => {
  // `pnpm --filter @yonyoung/web start`의 cwd는 apps/web, API는 같은 워크스페이스의 apps/api다.
  // 배포 환경에 git이나 apps/api가 없으면 각 값은 "unknown"/null로 남는다.
  const webRoot = process.cwd();
  const apiRoot = path.resolve(webRoot, "../api");
  const [web, api] = await Promise.all([
    readProjectMeta(webRoot),
    readProjectMeta(apiRoot),
  ]);

  return {
    web,
    api,
  };
};

/**
 * 값은 배포마다 고정이므로 프로세스당 한 번만 읽는다 (요청마다 git 프로세스를 띄우지 않는다).
 * 하위 읽기가 모두 실패를 값으로 바꾸므로 이 promise는 reject되지 않는다.
 */
let runtimeMetaPromise: Promise<DashboardRuntimeMeta> | undefined;

export const readDashboardRuntimeMeta = (): Promise<DashboardRuntimeMeta> => {
  runtimeMetaPromise ??= readRuntimeMeta();
  return runtimeMetaPromise;
};
