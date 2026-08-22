import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const workspaceParents = ["apps", "packages"];
const sourceExtensions = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);
const ignoredDirectories = new Set([
  ".next",
  ".turbo",
  ".wrangler",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const isInside = (candidate, directory) => {
  const relative = path.relative(directory, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

const readWorkspacePackages = async () => {
  const packages = [];
  for (const parentName of workspaceParents) {
    const parent = path.join(repositoryRoot, parentName);
    for (const entry of await readdir(parent, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const root = path.join(parent, entry.name);
      const manifest = JSON.parse(
        await readFile(path.join(root, "package.json"), "utf8"),
      );
      packages.push({ manifest, name: manifest.name, root });
    }
  }
  return packages;
};

const walk = async (directory, files = []) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target, files);
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(target);
  }
  return files;
};

const importSpecifiers = (source) => {
  const matches = [];
  const expression =
    /(?:\b(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?|\bimport\s*\(|\brequire\s*\()\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(expression)) matches.push(match[1]);
  return matches;
};

const workspacePackages = await readWorkspacePackages();
const byName = new Map(
  workspacePackages.map((workspace) => [workspace.name, workspace]),
);
const webRoot = byName.get("@yonyoung/web")?.root;
const apiRoot = byName.get("@yonyoung/api")?.root;
const contractRoot = byName.get("@yonyoung/contracts")?.root;
const errors = [];

for (const owner of workspacePackages) {
  const declared = new Set([
    ...Object.keys(owner.manifest.dependencies ?? {}),
    ...Object.keys(owner.manifest.devDependencies ?? {}),
    ...Object.keys(owner.manifest.peerDependencies ?? {}),
  ]);

  for (const file of await walk(owner.root)) {
    const source = await readFile(file, "utf8");
    for (const specifier of importSpecifiers(source)) {
      const packageName = specifier.startsWith("@yonyoung/")
        ? specifier.split("/").slice(0, 2).join("/")
        : null;
      const dependency = packageName ? byName.get(packageName) : null;

      if (
        dependency &&
        dependency.name !== owner.name &&
        !declared.has(dependency.name)
      ) {
        errors.push(
          `${path.relative(repositoryRoot, file)} imports undeclared workspace dependency ${dependency.name}`,
        );
      }

      if (dependency) {
        const exportKey =
          specifier === dependency.name
            ? "."
            : `.${specifier.slice(dependency.name.length)}`;
        if (!(exportKey in (dependency.manifest.exports ?? {}))) {
          errors.push(
            `${path.relative(repositoryRoot, file)} imports non-public export ${specifier}`,
          );
        }
      }

      const resolved = specifier.startsWith(".")
        ? path.resolve(path.dirname(file), specifier)
        : dependency?.root;
      if (!resolved) continue;

      if (
        webRoot &&
        apiRoot &&
        isInside(file, webRoot) &&
        isInside(resolved, apiRoot)
      ) {
        errors.push(
          `${path.relative(repositoryRoot, file)} crosses web -> API implementation boundary via ${specifier}`,
        );
      }
      if (
        webRoot &&
        apiRoot &&
        isInside(file, apiRoot) &&
        isInside(resolved, webRoot)
      ) {
        errors.push(
          `${path.relative(repositoryRoot, file)} crosses API -> web implementation boundary via ${specifier}`,
        );
      }
      if (
        contractRoot &&
        isInside(file, contractRoot) &&
        ((webRoot && isInside(resolved, webRoot)) ||
          (apiRoot && isInside(resolved, apiRoot)))
      ) {
        errors.push(
          `${path.relative(repositoryRoot, file)} makes contracts depend on an application via ${specifier}`,
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error(
    `Package boundary validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Package boundaries valid across ${workspacePackages.length} workspaces.`,
  );
}
