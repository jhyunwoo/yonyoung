import { DEFAULT_PAGES } from "./default-pages";
import { APP_MIGRATIONS } from "./migrations";

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function safeParseJson<T>(value: unknown, fallback: T): T {
  return parseJson(value, fallback);
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const prev = index > 0 ? sql[index - 1] : "";

    if (char === "'" && !inDoubleQuote && !inBacktick && prev !== "\\") {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuote && !inBacktick && prev !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === "`" && !inSingleQuote && !inDoubleQuote && prev !== "\\") {
      inBacktick = !inBacktick;
      current += char;
      continue;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const statement = current.trim();
      if (statement.length > 0) {
        statements.push(statement);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail.length > 0) {
    statements.push(tail);
  }

  return statements;
}

async function runSqlStatements(db: D1Database, sql: string): Promise<void> {
  const statements = splitSqlStatements(sql);
  for (const statement of statements) {
    await db.prepare(statement).run();
  }
}

export async function runMigrations(db: D1Database): Promise<void> {
  await runSqlStatements(
    db,
    `
CREATE TABLE IF NOT EXISTS app_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
)
`
  );

  for (const migration of APP_MIGRATIONS) {
    const existing = await db
      .prepare("SELECT id FROM app_migrations WHERE id = ?")
      .bind(migration.id)
      .first<{ id: string }>();

    if (existing?.id) {
      continue;
    }

    await runSqlStatements(db, migration.sql);
    await db
      .prepare("INSERT INTO app_migrations (id, applied_at) VALUES (?, ?)")
      .bind(migration.id, new Date().toISOString())
      .run();
  }

  for (const page of DEFAULT_PAGES) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO site_pages (slug, title, content_json, updated_at) VALUES (?, ?, ?, ?)"
      )
      .bind(page.slug, page.title, JSON.stringify(page.contentJson), new Date().toISOString())
      .run();
  }
}

export const json = {
  parse: safeParseJson
};
