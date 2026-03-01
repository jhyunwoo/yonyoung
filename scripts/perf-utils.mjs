import { spawn } from "node:child_process";

export const parseArgs = (argv) =>
  Object.fromEntries(
    argv.map((entry) => {
      const [key, value] = entry.split("=");
      return [key.replace(/^--/, ""), value ?? "true"];
    }),
  );

export const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

export const formatMs = (value, digits = 2) =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}ms` : "-";

export const renderTable = (headers, rows) => {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index]).length)),
  );

  const renderRow = (cells) =>
    `| ${cells.map((cell, index) => String(cell).padEnd(widths[index], " ")).join(" | ")} |`;
  const divider = `|-${widths.map((width) => "-".repeat(width)).join("-|-")}-|`;

  return [renderRow(headers), divider, ...rows.map((row) => renderRow(row))];
};

export const runCommand = (command, commandArgs, env = process.env) =>
  new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      stdio: "inherit",
      env,
    });

    child.on("error", () => resolve(1));
    child.on("exit", (code) => resolve(code ?? 1));
  });
