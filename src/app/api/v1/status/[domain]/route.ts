import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { normalizeDomain } from "@/lib/urls";

export async function GET(_req: NextRequest, context: { params: Promise<{ domain: string }> }) {
  try {
    const { domain } = await context.params;
    const normalized = normalizeDomain(domain.toLowerCase());
    const dres = await query<{ id: number; verified: boolean; pages: number; last: string | null }>(
      `SELECT d.id, d.verified, 
              COUNT(p.id)::int AS pages, 
              MAX(p.last_crawled_at)::text AS last 
       FROM domains d 
       LEFT JOIN pages p ON p.domain_id = d.id 
       WHERE d.name = $1 
       GROUP BY d.id, d.verified`,
      [normalized]
    );
    if (dres.rows.length === 0) return NextResponse.json({ verified: false, pagesIndexed: 0 });
    const { verified, pages, last } = dres.rows[0];
    return NextResponse.json({ verified, pagesIndexed: pages, lastCrawledAt: last });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
