# 404 Solver

A minimal Next.js application that provides intelligent 404 page recommendations by leveraging semantic search and vector embeddings. Instead of showing dead-end 404 pages, it suggests relevant on-site content to help users find what they're looking for.

## Features

- **Smart 404 Recommendations**: Show relevant pages instead of dead-end 404s
- **Semantic Search**: Uses vector embeddings for intelligent content matching
- **Easy Integration**: Simple JavaScript snippet for any website
- **Direct Crawling**: Uses [Kernel](https://onkernel.com) browsers to crawl and vectorize sites directly
- **PostgreSQL + pgvector**: Efficient vector similarity search
- **OpenAI Embeddings**: High-quality semantic understanding

## How It Works

1. **Content Ingestion**: Your website content is crawled and vectorized using [Kernel](https://onkernel.com) browsers
2. **Vector Storage**: Content chunks and embeddings are stored in PostgreSQL with pgvector
3. **Smart Recommendations**: When a 404 occurs, the system performs semantic search to find relevant pages
4. **User Experience**: A simple snippet displays helpful suggestions instead of a dead-end page

## Architecture

- **Frontend**: Next.js App Router with TypeScript
- **Database**: PostgreSQL with pgvector extension for vector similarity search
- **Embeddings**: OpenAI API for generating semantic embeddings
- **Crawling**: [Kernel](https://onkernel.com) browsers for direct web scraping and content vectorization
- **Validation**: Zod for request/response validation

## Quick Start

### Prerequisites

- Node.js 18+ and Bun
- PostgreSQL with pgvector extension
- OpenAI API key
- Kernel API key

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd 404-solver
   bun install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   DATABASE_URL="postgres://user:password@localhost:5432/404solver"
   OPENAI_API_KEY="sk-..."
   KERNEL_API_KEY="..."
   APP_BASE_URL="https://your-app.com"
   RATE_LIMIT_RECS_PER_MINUTE="60"
   TOP_N_DEFAULT="5"
   ```

3. **Set up the database**:
   ```bash
   # Run the migration to create tables and enable pgvector
   psql $DATABASE_URL -f migrations/001_init.sql
   ```

4. **Start the development server**:
   ```bash
   bun dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Public API

- `POST /api/v1/recommendations` - Get 404 page recommendations
- `GET /api/v1/status/[domain]` - Check domain indexing status
- `POST /api/v1/domains` - Register a new domain
- `POST /api/v1/domains/[id]/verify` - Verify domain ownership

### Internal API

- `POST /api/internal/kernel/crawl` - Trigger Kernel browser crawling and vectorization

## Integration

### 1. Register Your Domain

```bash
curl -X POST https://your-app.com/api/v1/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

### 2. Add the Snippet to Your 404 Page

```html
<div id="smart-404"></div>
<script>
(function(){
  const siteKey = "pk_live_xxx"; // Get this from your domain registration
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
          ${results.map(r=>`<li><a href="${r.url}">${r.title||r.url}</a><div style="opacity:.7">${r.snippet||""}</div></li>`).join("")}
        </ul>
      </div>`;
  }).catch(()=>{});
})();
</script>
```

### 3. Start Content Crawling

```bash
curl -X POST https://your-app.com/api/internal/kernel/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "sitemapUrl": "https://example.com/sitemap.xml"
  }'
```

## Database Schema

The application uses PostgreSQL with the following key tables:

- `domains` - Registered domains and their settings
- `pages` - Crawled pages with metadata
- `chunks` - Text chunks with vector embeddings
- `recommendation_events` - Analytics for recommendations
- `blocklist_rules` - URL patterns to exclude

## Development

### Project Structure

```
src/
  app/
    api/
      v1/                    # Public API endpoints
      internal/              # Internal webhooks
  lib/
    db.ts                   # Database client and helpers
    embeddings.ts           # Embedding provider wrapper
    ranking.ts              # Search ranking logic
    auth.ts                 # Authentication and validation
    validation.ts           # Zod schemas
    urls.ts                 # URL normalization
migrations/
  001_init.sql             # Database schema
```

### Running Tests

```bash
bun test
```

### Building for Production

```bash
bun run build
```

## Security

- **Origin Validation**: Checks that requests come from verified domains
- **API Authentication**: Kernel API calls are authenticated using API keys
- **Rate Limiting**: Configurable rate limits for API endpoints
- **No PII Storage**: Only stores public content and metadata

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions and support, please open an issue on GitHub or contact the development team.
