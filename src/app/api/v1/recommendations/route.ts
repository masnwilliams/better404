import { NextRequest, NextResponse } from "next/server";
import { RecommendationsRequestSchema } from "@/lib/validation";
import { embedQueryText } from "@/lib/embeddings";
import { extractDomainAndPath, buildQueryTextFromUrl } from "@/lib/urls";
import { query, toVectorLiteral } from "@/lib/db";

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const body = await req.json();
    const parsed = RecommendationsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const { siteKey, url, referrer, topN } = parsed.data;

    // Resolve domain from siteKey
    const domainRes = await query<{ id: number; name: string }>(
      "SELECT id, name FROM domains WHERE site_key_public = $1 AND verified = true",
      [siteKey]
    );
    if (domainRes.rows.length === 0) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const domainRow = domainRes.rows[0];

    // Basic referer/origin check if present
    const origin = req.headers.get("origin") || req.headers.get("referer");
    if (origin) {
      const originHost = new URL(origin).hostname.toLowerCase().replace(/^www\./, "");
      if (originHost !== domainRow.name) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    const { domain, normalizedPath } = extractDomainAndPath(url);
    if (domain !== domainRow.name) {
      // Cross-domain request blocked
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const k = Math.min(Math.max(topN ?? Number(process.env.TOP_N_DEFAULT ?? 5), 1), 20);

    // Build query text (path tokens) and embed
    const qtext = buildQueryTextFromUrl(url);
    const qvec = await embedQueryText(qtext);

    // Hybrid search (vector first; lexical prefilter can be added later)
    const vectorLiteral = toVectorLiteral(qvec);
    const sql = `
      SELECT p.url, p.title,
             1 - (c.embedding <=> ${vectorLiteral}) AS score,
             substring(c.text from 1 for 200) AS snippet
      FROM chunks c
      JOIN pages p ON p.id = c.page_id
      JOIN domains d ON d.id = p.domain_id
      WHERE d.id = $1
      ORDER BY c.embedding <=> ${vectorLiteral}
      LIMIT $2
    `;
    const { rows } = await query<{ url: string; title: string | null; snippet: string | null; score: number }>(sql, [domainRow.id, k]);

    const latency = Date.now() - started;
    // Fire-and-forget log (ignore errors)
    query(
      "INSERT INTO recommendation_events (domain_id, request_url, referrer, results_json, latency_ms) VALUES ($1,$2,$3,$4,$5)",
      [domainRow.id, url, referrer ?? null, JSON.stringify(rows), latency]
    ).catch(() => {});

    return NextResponse.json({ results: rows });
  } catch (e) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}


