import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { normalizeDomain } from "@/lib/urls";

export async function GET(_req: NextRequest, { params }: { params: { domain: string } }) {
  try {
    const domain = normalizeDomain(params.domain.toLowerCase());
    const dres = await query<{ id: number; verified: boolean }>(
      "SELECT id, verified FROM domains WHERE name = $1",
      [domain]
    );
    if (dres.rows.length === 0) return NextResponse.json({ verified: false, pagesIndexed: 0 });
    const { id, verified } = dres.rows[0];
    const pres = await query<{ pages: number; last: string | null }>(
      `SELECT COUNT(*)::int AS pages, MAX(last_crawled_at)::text AS last FROM pages WHERE domain_id = $1`,
      [id]
    );
    const pagesIndexed = pres.rows[0]?.pages ?? 0;
    const lastCrawledAt = pres.rows[0]?.last ?? null;
    return NextResponse.json({ verified, pagesIndexed, lastCrawledAt });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
