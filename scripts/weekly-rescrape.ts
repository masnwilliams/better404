import { Pool } from "pg";
import { startKernelScrape } from "../src/lib/kernel-server";

// Simple concurrency limiter
async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let nextIndex = 0;
  const runners: Promise<void>[] = [];

  async function runOne() {
    const current = nextIndex++;
    if (current >= items.length) return;
    try {
      results[current] = await worker(items[current], current);
    } finally {
      await runOne();
    }
  }

  for (let i = 0; i < Math.min(limit, items.length); i++) {
    runners.push(runOne());
  }

  await Promise.all(runners);
  return results;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    // Select verified domains; if last_scraped_at is null or older than 7 days
    const { rows } = await client.query<{ id: number; name: string }>(
      `SELECT id, name
       FROM domains
       WHERE verified = true
         AND (last_scraped_at IS NULL OR last_scraped_at < NOW() - INTERVAL '7 days')
       ORDER BY last_scraped_at NULLS FIRST, id ASC`
    );

    if (!rows.length) {
      console.log("No domains require rescrape.");
      return;
    }

    console.log(`Rescraping ${rows.length} verified domains...`);

    const concurrency = 5; // max concurrent rescrapes

    await mapWithConcurrency(rows, concurrency, async (row: { id: number; name: string }) => {
      const domain = row.name;
      try {
        // Mark last_scraped_at to avoid duplicate work if script is re-run soon
        await client.query(`UPDATE domains SET last_scraped_at = NOW() WHERE id = $1`, [row.id]);
        console.log(`[rescrape] domain=${domain} marking last_scraped_at`);
        const res = await startKernelScrape(domain);
        console.log(`[rescrape] domain=${domain} ok=${res.ok}`);
      } catch (e) {
        console.error(`[rescrape] domain=${domain} error=${e instanceof Error ? e.message : String(e)}`);
      }
    });

    console.log("Rescrape kickoff complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
