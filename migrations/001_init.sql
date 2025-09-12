-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Domains registered in the app
CREATE TABLE IF NOT EXISTS domains (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT UNIQUE NOT NULL,
  site_key_public TEXT UNIQUE NOT NULL,
  site_key_salt   TEXT NOT NULL,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  settings_json   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pages discovered/ingested for a domain
CREATE TABLE IF NOT EXISTS pages (
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

-- Content chunks with embeddings
-- NOTE: Ensure the dimension matches your embedding model (e.g., 1536 for text-embedding-3-small)
CREATE TABLE IF NOT EXISTS chunks (
  id         BIGSERIAL PRIMARY KEY,
  page_id    BIGINT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  ord        INT NOT NULL,
  text       TEXT NOT NULL,
  tokens     INT,
  anchor     TEXT,
  embedding  VECTOR(1536)
);
CREATE INDEX IF NOT EXISTS idx_chunks_page_ord ON chunks(page_id, ord);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Observability of recommendations
CREATE TABLE IF NOT EXISTS recommendation_events (
  id           BIGSERIAL PRIMARY KEY,
  domain_id    BIGINT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  request_url  TEXT NOT NULL,
  referrer     TEXT,
  results_json JSONB NOT NULL,
  latency_ms   INT NOT NULL,
  clicked_url  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional exclusions
CREATE TABLE IF NOT EXISTS blocklist_rules (
  id        BIGSERIAL PRIMARY KEY,
  domain_id BIGINT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  pattern   TEXT NOT NULL
);


