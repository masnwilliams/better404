import { Kernel, type KernelContext } from '@onkernel/sdk';
import { chromium } from 'playwright';
import OpenAI from 'openai';
import { Pool } from 'pg';

const kernel = new Kernel();
const app = kernel.app('better404');

// ----- Input/Output types -----
type CrawlInput = { domain: string };
type CrawlOutput = { ok: boolean; discovered: number };

// ----- Helpers -----
function normalizeDomain(hostname: string): string {
  const lower = hostname.toLowerCase();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function robotsSitemaps(baseUrl: string): Promise<string[]> {
  const robotsUrl = new URL('/robots.txt', baseUrl).toString();
  const text = await fetchText(robotsUrl);
  if (!text) return [];
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*Sitemap:\s*(\S+)/i);
    if (m) {
      try { out.push(new URL(m[1], baseUrl).toString()); } catch {}
    }
  }
  return out;
}

function extractLocs(xml: string): string[] {
  // Namespace-agnostic <loc> extraction
  const locs = Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gim)).map(m => m[1]);
  return locs;
}

async function crawlSitemapRecursive(startUrl: string, sameHost: string, visited = new Set<string>(), depth = 0, maxDepth = 3, pageLimit = 10000): Promise<Set<string>> {
  const pages = new Set<string>();
  if (depth > maxDepth || visited.has(startUrl)) return pages;
  visited.add(startUrl);
  const xml = await fetchText(startUrl);
  if (!xml) return pages;
  const lower = xml.toLowerCase();
  const locs = extractLocs(xml);
  for (const loc of locs) {
    if (pages.size >= pageLimit) break;
    let abs: URL;
    try { abs = new URL(loc, startUrl); } catch { continue; }
    const host = normalizeDomain(abs.hostname);
    if (host !== sameHost) continue;
    const href = abs.toString();
    if (lower.includes('<sitemapindex')) {
      // loc points to a child sitemap; recurse
      const childPages = await crawlSitemapRecursive(href, sameHost, visited, depth + 1, maxDepth, pageLimit - pages.size);
      childPages.forEach(u => pages.add(u));
    } else if (lower.includes('<urlset')) {
      // loc points to a page URL (from a regular sitemap)
      pages.add(href);
    } else {
      // best-effort: if we cannot distinguish, try to fetch and see
      const childXml = await fetchText(href);
      if (childXml) {
        const childLower = childXml.toLowerCase();
        if (childLower.includes('<sitemapindex')) {
          const childLocs = extractLocs(childXml);
          for (const cl of childLocs) {
            const cu = new URL(cl, href);
            if (normalizeDomain(cu.hostname) !== sameHost) continue;
            const nested = await crawlSitemapRecursive(cu.toString(), sameHost, visited, depth + 1, maxDepth, pageLimit - pages.size);
            nested.forEach(u => pages.add(u));
            if (pages.size >= pageLimit) break;
          }
        } else if (childLower.includes('<urlset')) {
          const urlLocs = extractLocs(childXml);
          for (const ul of urlLocs) {
            const uu = new URL(ul, href);
            if (normalizeDomain(uu.hostname) !== sameHost) continue;
            pages.add(uu.toString());
            if (pages.size >= pageLimit) break;
          }
        }
      }
    }
  }
  return pages;
}

async function discoverUrls(domain: string): Promise<string[]> {
  const base = `https://${domain}`;
  const sameHost = normalizeDomain(new URL(base).hostname);
  // Seed sitemap URLs: common candidates + robots.txt entries
  const candidates = [
    new URL('/sitemap.xml', base).toString(),
    new URL('/sitemap_index.xml', base).toString(),
    new URL('/sitemap-index.xml', base).toString(),
    new URL('/sitemap1.xml', base).toString(),
  ];
  const robotMaps = await robotsSitemaps(base);
  const startSitemaps = Array.from(new Set([...candidates, ...robotMaps]));

  const visited = new Set<string>();
  const pages = new Set<string>();
  for (const sm of startSitemaps) {
    const found = await crawlSitemapRecursive(sm, sameHost, visited, 0, 3, 10000);
    found.forEach(u => pages.add(u));
    if (pages.size >= 1) break; // if we found any, we can proceed; remove this break to collect all
  }
  if (pages.size > 0) return Array.from(pages);
  // Fallback: just seed with homepage if no sitemap
  return [base];
}

function chunkText(text: string, size = 800, overlap = 200): string[] {
  const out: string[] = [];
  if (!text) return out;
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + size, text.length);
    out.push(text.slice(i, end));
    if (end === text.length) break;
    i = Math.max(0, end - overlap);
  }
  return out;
}

// ----- Core action: crawl -> clean -> chunk -> embed -> store -----
app.action<CrawlInput, CrawlOutput>('crawl-domain', async (_ctx: KernelContext, payload?: CrawlInput): Promise<CrawlOutput> => {
  const domain = (payload?.domain || '').toLowerCase();
  if (!domain) return { ok: false, discovered: 0 };

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log(`[crawl] start domain=${domain}`);
    const urls = await discoverUrls(domain);
    console.log(`[crawl] discovered urls=${urls.length}`);
    let discovered = 0;

    const browserSession = await kernel.browsers.create({ stealth: true });
    console.log(`[crawl] kernel browser session=${browserSession.session_id}`);
    const browser = await chromium.connectOverCDP(browserSession.cdp_ws_url);
    const context = (browser.contexts()[0]) || (await browser.newContext());
    const page = (context.pages()[0]) || (await context.newPage());

    const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    console.log(`[crawl] openai=${openai ? 'on' : 'off'}`);

    for (const url of urls) {
      // Sequentially visit each URL
      try {
        console.log(`[crawl] nav ${url}`);
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
        const status = resp?.status();
        const title = await page.title().catch(() => undefined);
        // Try multiple extraction strategies for robustness
        const text = await page.evaluate(() => {
          const body = document.body;
          const inner = (body?.innerText || '').trim();
          if (inner && inner.length > 200) return inner;
          const text2 = (body?.textContent || '').replace(/\s+/g, ' ').trim();
          return text2;
        }).catch(() => '');
        console.log(`[crawl] status=${status ?? 'n/a'} titleLen=${(title||'').length} textLen=${text.length}`);

        let cleaned = text;
        if (openai && cleaned) {
          // Cheap/fast LLM: compress/clean into markdown-like text
          const md = await openai.chat.completions.create({
            model: 'gpt-4.1-nano',
            messages: [
              { role: 'system', content: 'You rewrite webpage text into concise, structured Markdown. Keep headings and lists. Remove nav/footer fluff.' },
              { role: 'user', content: `Rewrite into concise Markdown, preserving key headings:
URL: ${url}
TITLE: ${title || ''}
TEXT:
${cleaned.slice(0, 12000)}` }
            ],
            temperature: 0.2,
            max_tokens: 1200,
          });
          cleaned = md.choices[0]?.message?.content ?? cleaned;
          console.log(`[crawl] cleanedLen=${cleaned.length}`);
        }

        const { rows: drows } = await client.query('SELECT id FROM domains WHERE name = $1', [domain]);
        if (drows.length === 0) continue;
        const domainId = drows[0].id as number;

        const upsertPageSQL = `
          INSERT INTO pages (domain_id, url, title, status, language, content_hash, last_crawled_at)
          VALUES ($1,$2,$3,$4,$5,$6,NOW())
          ON CONFLICT (domain_id, url)
          DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status, language = EXCLUDED.language, content_hash = EXCLUDED.content_hash, last_crawled_at = NOW()
          RETURNING id
        `;
        const contentHash = String(cleaned.length);
        const { rows: prows } = await client.query(upsertPageSQL, [domainId, url, title ?? null, status ?? null, null, contentHash]);
        const pageId = prows[0].id as number;

        await client.query('DELETE FROM chunks WHERE page_id = $1', [pageId]);

        // Chunk + embed + store sequentially
        const chunks = chunkText(cleaned);
        console.log(`[crawl] chunks=${chunks.length}`);
        const expectedDim = Number(process.env.EMBEDDING_DIM || '1536');
        for (let ord = 0; ord < chunks.length; ord++) {
          const ch = chunks[ord];
          try {
            // Embed via app webhook route reusing app code or embed inline (OpenAI)
            let vec: number[] | null = null;
            if (openai) {
              const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: ch });
              vec = (emb.data[0]?.embedding as number[]) || null;
            }
            if (vec && Array.isArray(vec)) {
              if (vec.length !== expectedDim) {
                console.log(`[crawl] embedding-dim-mismatch ord=${ord} got=${vec.length} expected=${expectedDim}; inserting without vector`);
                await client.query('INSERT INTO chunks (page_id, ord, text) VALUES ($1,$2,$3)', [pageId, ord, ch]);
              } else {
                const vecStr = `[${vec.join(',')}]`;
                try {
                  await client.query('INSERT INTO chunks (page_id, ord, text, embedding) VALUES ($1,$2,$3,$4::vector)', [pageId, ord, ch, vecStr]);
                } catch (e) {
                  console.log(`[crawl] vector-insert-error ord=${ord} falling back to text-only err=${e instanceof Error ? e.message : String(e)}`);
                  await client.query('INSERT INTO chunks (page_id, ord, text) VALUES ($1,$2,$3)', [pageId, ord, ch]);
                }
              }
            } else {
              await client.query('INSERT INTO chunks (page_id, ord, text) VALUES ($1,$2,$3)', [pageId, ord, ch]);
            }
          } catch (e) {
            console.log(`[crawl] chunk-insert error page_id=${pageId} ord=${ord} err=${e instanceof Error ? e.message : String(e)}`);
          }
        }
        // Verify inserted count for this page
        const { rows: cnt } = await client.query('SELECT COUNT(*)::int as n FROM chunks WHERE page_id = $1', [pageId]);
        console.log(`[crawl] page_id=${pageId} chunks_now=${cnt[0]?.n ?? 0}`);
        discovered += 1;
        console.log(`[crawl] stored page ok url=${url}`);
      } catch (e) {
        console.log(`[crawl] error url=${url} err=${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await browser.close();
    console.log(`[crawl] done domain=${domain} pages=${discovered}`);
    return { ok: true, discovered };
  } finally {
    client.release();
    await pool.end();
  }
});


