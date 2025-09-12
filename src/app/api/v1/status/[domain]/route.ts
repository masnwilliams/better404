import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ domain: string }> }) {
  try {
    const { domain } = await ctx.params;
    const name = domain.toLowerCase();
    const { rows: drows } = await query<{ id: number; verified: boolean }>(
      "SELECT id, verified FROM domains WHERE name = $1",
      [name]
    );
    if (drows.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const domainId = drows[0].id;

    const { rows: prow } = await query<{ count: string; last: string | null }>(
      "SELECT COUNT(*)::text as count, MAX(last_crawled_at)::text as last FROM pages WHERE domain_id = $1",
      [domainId]
    );
    return NextResponse.json({ verified: drows[0].verified, pagesIndexed: Number(prow[0].count), lastCrawledAt: prow[0].last });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}


