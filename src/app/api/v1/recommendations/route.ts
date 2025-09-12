import { NextRequest, NextResponse } from "next/server";
import { RecommendationsRequestSchema } from "@/lib/validation";
import { embedQueryText } from "@/lib/embeddings";
import { extractDomainAndPath, buildQueryTextFromUrl } from "@/lib/urls";
import { query, toVectorLiteral } from "@/lib/db";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    console.log(`[recommendations] POST request started`);
    const body = await req.json();
    const parsed = RecommendationsRequestSchema.safeParse(body);
    if (!parsed.success) {
      console.log(`[recommendations] validation failed: ${JSON.stringify(parsed.error)}`);
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const { siteKey, url, referrer, topN } = parsed.data;
    console.log(`[recommendations] siteKey=${siteKey} url=${url} referrer=${referrer} topN=${topN}`);

    // Resolve domain from siteKey; only allow verified domains
    const domainRes = await query<{ id: number; name: string }>(
      "SELECT id, name FROM domains WHERE site_key_public = $1 AND verified = true",
      [siteKey]
    );
    if (domainRes.rows.length === 0) {
      console.log(`[recommendations] unauthorized siteKey=${siteKey}`);
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const domainRow = domainRes.rows[0];
    console.log(`[recommendations] domain resolved id=${domainRow.id} name=${domainRow.name}`);

    // Basic referer/origin check if present
    const origin = req.headers.get("origin") || req.headers.get("referer");
    if (origin) {
      const originHost = new URL(origin).hostname.toLowerCase().replace(/^www\./, "");
      if (originHost !== domainRow.name) {
        console.log(`[recommendations] origin mismatch origin=${originHost} expected=${domainRow.name}`);
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    const { domain } = extractDomainAndPath(url);
    if (domain !== domainRow.name) {
      console.log(`[recommendations] cross-domain blocked domain=${domain} expected=${domainRow.name}`);
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const k = Math.min(Math.max(topN ?? Number(process.env.TOP_N_DEFAULT ?? 5), 1), 20);
    console.log(`[recommendations] search limit k=${k}`);

    // Build query text (path tokens) and optionally enrich via cheap LLM
    const qtext = buildQueryTextFromUrl(url);
    console.log(`[recommendations] query text: ${qtext}`);
    let enriched = qtext;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });
        const model = process.env.CHEAP_LLM_MODEL || "gpt-4.1-nano";
        const comp = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: "You transform URL paths into a concise, typo-corrected search query that captures user intent for internal search. Output only the query, no quotes." },
            { role: "user", content: `URL: ${url}\nPath tokens: ${qtext}\nReferrer: ${referrer || "n/a"}\nTask: Produce a short search query (3-10 words) correcting typos and expanding likely synonyms.` },
          ],
          temperature: 0.2,
          max_tokens: 40,
        });
        const candidate = comp.choices[0]?.message?.content?.trim();
        if (candidate) enriched = candidate;
        console.log(`[recommendations] query enriched: ${enriched}`);
      } catch (e) {
        console.log(`[recommendations] query-enrich error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    const qvec = await embedQueryText(enriched);
    console.log(`[recommendations] embedding generated length=${qvec.length}`);

    // Hybrid search (vector first; lexical prefilter can be added later)
    const vectorLiteral = toVectorLiteral(qvec);
    const sql = `
      SELECT p.url, p.title,
             1 - (c.embedding <=> ${vectorLiteral}) AS score,
             substring(c.text from 1 for 200) AS snippet
      FROM chunks c
      JOIN pages p ON p.id = c.page_id
      JOIN domains d ON d.id = p.domain_id
      WHERE d.id = $1 AND d.verified = true
      ORDER BY c.embedding <=> ${vectorLiteral}
      LIMIT $2
    `;
    const { rows } = await query<{ url: string; title: string | null; snippet: string | null; score: number }>(sql, [domainRow.id, k]);
    console.log(`[recommendations] search completed results=${rows.length}`);

    const latency = Date.now() - started;
    console.log(`[recommendations] request completed latency=${latency}ms`);
    // Fire-and-forget log (ignore errors)
    query(
      "INSERT INTO recommendation_events (domain_id, request_url, referrer, results_json, latency_ms) VALUES ($1,$2,$3,$4,$5)",
      [domainRow.id, url, referrer ?? null, JSON.stringify(rows), latency]
    ).catch(() => {});

    return NextResponse.json({ results: rows });
  } catch (e) {
    console.log(`[recommendations] error: ${e instanceof Error ? e.message : String(e)}`);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
