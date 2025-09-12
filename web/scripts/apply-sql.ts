import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: bun scripts/apply-sql.ts <path-to-sql>");
    process.exit(1);
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const sqlPath = join(process.cwd(), file);
  const sql = readFileSync(sqlPath, "utf8");
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Applied:", file);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


