import { APP_MIGRATIONS } from "../migrations";

// This script prints SQL for wrangler d1 execution.
for (const migration of APP_MIGRATIONS) {
  process.stdout.write(`-- ${migration.id}\n`);
  process.stdout.write(migration.sql.trim());
  process.stdout.write("\n\n");
}
