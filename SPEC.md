## 404 Solver — Minimal Single Next.js App Spec (no Prisma)

### 1) What it does
- On 404 pages, show relevant on‑site pages instead of a dead end.
- Customer adds a snippet to their 404; it calls our API with the current URL; we return top N results from a semantic index.
- Use onkernel.com to scrape. We ingest Kernel webhooks, chunk + embed, and store vectors in Postgres pgvector.

### 2) Architecture
- Next.js App Router (TypeScript, Bun). API under `src/app/api/*` (src layout).
- Postgres + pgvector for chunks and similarity search. No Redis; no queues.
- Embeddings: OpenAI (MVP). Validation with Zod.

### 3) Minimal directory layout
```
src/
  app/
    api/
      v1/
        recommendations/route.ts
        status/[domain]/route.ts
        domains/route.ts
        domains/[id]/verify/route.ts
      internal/
        kernel/webhook/route.ts
  lib/
    db.ts               # raw Postgres client + pgvector helpers (no ORM)
    embeddings.ts       # provider wrapper
    ranking.ts          # lexical prefilter + vector + boosts (later)
    auth.ts             # siteKey issuance + origin checks (later)
    validation.ts       # Zod schemas
    urls.ts             # URL normalization
migrations/
  001_init.sql          # tables + pgvector
env.d.ts
package.json
```

### 4) Environment
```
DATABASE_URL="postgres://..."        # pgvector enabled
REDIS_URL="..."
EMBEDDINGS_PROVIDER="openai"         # or "voyage"
OPENAI_API_KEY="..."
VOYAGE_API_KEY="..."
KERNEL_API_BASE_URL="https://api.onkernel.com"
KERNEL_API_KEY="..."
KERNEL_WEBHOOK_SECRET="..."
APP_BASE_URL="https://your-app.com"
SITE_KEY_SIGNING_SECRET="..."
RATE_LIMIT_RECS_PER_MINUTE="60"
TOP_N_DEFAULT="5"
EMBEDDING_DIM="1536"                 # must match table DDL
```

### 5) Database schema (raw SQL)
```
-- migrations/001_init.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE domains (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT UNIQUE NOT NULL,
  site_key_public TEXT UNIQUE NOT NULL,
  site_key_salt   TEXT NOT NULL,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  settings_json   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pages (
  id              BIGSERIAL PRIMARY KEY,
  domain_id       BIGINT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  title           TEXT,
  status          INT,
  last_crawled_at TIMESTAMPTZ,
  content_hash    TEXT,
  language        TEXT,
  UNIQUE(domain_id, url)
);

CREATE TABLE chunks (
  id         BIGSERIAL PRIMARY KEY,
  page_id    BIGINT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  ord        INT NOT NULL,
  text       TEXT NOT NULL,
  tokens     INT,
  anchor     TEXT,
  embedding  VECTOR(1536)
);
CREATE INDEX idx_chunks_page_ord ON chunks(page_id, ord);
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

CREATE TABLE recommendation_events (
  id           BIGSERIAL PRIMARY KEY,
  domain_id    BIGINT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  request_url  TEXT NOT NULL,
  referrer     TEXT,
  results_json JSONB NOT NULL,
  latency_ms   INT NOT NULL,
  clicked_url  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blocklist_rules (
  id        BIGSERIAL PRIMARY KEY,
  domain_id BIGINT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  pattern   TEXT NOT NULL
);
```

### 6) Kernel integration
- Start crawl: `POST {KERNEL_API_BASE_URL}/v1/scrape { domain, sitemapUrl?, webhookUrl }`.
- Webhook: `POST /api/internal/kernel/webhook` with `X-Kernel-Signature` HMAC; payload `{ domain, pages: [{ url, status, title, text, language, etag, lastModified }] }`.
- Process: normalize → `content_hash` check → chunk → embed → upsert `pages` + `chunks`.

### 7) API
- POST `/api/v1/recommendations`
  - Body: `{ siteKey, url, referrer?, topN? }`
  - Validate siteKey + Origin/Referer; normalize URL; cache lookup; search; return `{ results }`.

- GET `/api/v1/status/[domain]`
  - Return `{ verified, pagesIndexed, lastCrawledAt }`.

- POST `/api/v1/domains` → create domain, issue `site_key_public` and verification instructions.
- POST `/api/v1/domains/[id]/verify` → mark verified.
-- (Removed) webhook ingestion; Kernel app writes to Postgres directly.

### 8) Client snippet
```html
<div id="smart-404"></div>
<script>
(function(){
  const siteKey = "pk_live_xxx";
  const url = location.href;
  const ref = document.referrer || null;
  fetch("https://api.your-app.com/api/v1/recommendations",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({siteKey,url,referrer:ref,topN:5})
  }).then(r=>r.json()).then(({results})=>{
    const el=document.getElementById("smart-404");
    if(!el||!Array.isArray(results)) return;
    el.innerHTML=`
      <div style="margin:16px 0">
        <h2 style="margin:0 0 8px">Were you looking for one of these?</h2>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">
          ${results.map(r=>`<li><a href="${r.url}">${r.title||r.url}</a><div style=\"opacity:.7\">${r.snippet||""}</div></li>`).join("")}
        </ul>
      </div>`;
  }).catch(()=>{});
})();
</script>
```

### 9) Ranking (minimal)
- Lexical prefilter (BM25) on headings/title → top 50, then vector KNN over those.
- Boost same-section paths and title overlap; dedupe by canonical.

### 10) Security
- Check Origin/Referer domain matches verified domain. HMAC verify Kernel webhook.
- No PII; private cache headers.

### 11) Build checklist
1) Run `migrations/001_init.sql` on Postgres with pgvector.
2) Implement Kernel webhook ingest with synchronous chunk embeddings.
3) Implement `/api/v1/recommendations` (Zod validation and vector search).
4) Implement domain create/verify and a minimal dashboard page for snippet copy.


