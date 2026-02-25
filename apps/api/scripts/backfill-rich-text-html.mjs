#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const DB_NAME = process.env.D1_DB_NAME || "yonyoung-db";
const USE_REMOTE = process.env.D1_REMOTE !== "false";

const sqlEscape = (value) => value.replaceAll("'", "''");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const sanitizeExistingHtml = (html) => {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sjavascript:/gi, " ");
};

const looksLikeHtml = (value) => /<[^>]+>/.test(value);

const toParagraphHtml = (value) => {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) {
    return "<p></p>";
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`);

  if (paragraphs.length === 0) {
    return "<p></p>";
  }

  return paragraphs.join("");
};

const normalizeRichTextHtml = (value) => {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) {
    return "<p></p>";
  }

  if (looksLikeHtml(trimmed)) {
    const sanitized = sanitizeExistingHtml(trimmed).trim();
    return sanitized.length > 0 ? sanitized : "<p></p>";
  }

  return toParagraphHtml(trimmed);
};

const runWrangler = (command) => {
  const args = ["d1", "execute", DB_NAME, "--json", "--command", command];
  if (USE_REMOTE) {
    args.splice(3, 0, "--remote");
  }

  const result = spawnSync("wrangler", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "wrangler 실행에 실패했습니다.");
  }

  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [];
  }

  const first = parsed[0];
  if (!first || typeof first !== "object" || !Array.isArray(first.results)) {
    return [];
  }

  return first.results;
};

const migrateTable = ({ table, idColumn, contentColumn }) => {
  const rows = runWrangler(
    `SELECT ${idColumn} AS id, ${contentColumn} AS content FROM ${table} WHERE deleted_at IS NULL`,
  );

  let updatedCount = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }

    const id = String(row.id ?? "");
    const currentContent = String(row.content ?? "");
    const nextContent = normalizeRichTextHtml(currentContent);

    if (nextContent === currentContent) {
      continue;
    }

    const escapedContent = sqlEscape(nextContent);
    const escapedId = sqlEscape(id);
    runWrangler(
      `UPDATE ${table} SET ${contentColumn}='${escapedContent}', updated_at=CURRENT_TIMESTAMP WHERE ${idColumn}='${escapedId}'`,
    );
    updatedCount += 1;
  }

  return { total: rows.length, updated: updatedCount };
};

const targets = [
  { table: "activities", idColumn: "id", contentColumn: "description" },
  { table: "generation_notices", idColumn: "id", contentColumn: "content" },
  { table: "global_notices", idColumn: "id", contentColumn: "content" },
];

try {
  let totalRows = 0;
  let totalUpdated = 0;

  for (const target of targets) {
    const result = migrateTable(target);
    totalRows += result.total;
    totalUpdated += result.updated;
    console.log(
      `[${target.table}] scanned=${result.total} updated=${result.updated}`,
    );
  }

  console.log(`done scanned=${totalRows} updated=${totalUpdated}`);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "백필 스크립트 실행 중 오류가 발생했습니다.",
  );
  process.exit(1);
}
