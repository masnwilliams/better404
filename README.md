# Better404

Turn your 404 pages into helpful search results. Instead of dead-end 404s, show users relevant pages from your site using AI-powered semantic search.

## What is Better404?

Better404 solves the problem of broken links and missing pages by:
- **Crawling your entire site** and creating a searchable index
- **Using AI to understand content** and find relevant matches
- **Providing a simple snippet** you paste into your 404 page
- **Showing helpful suggestions** instead of "Page Not Found"

## How It Works

1. **Enter your domain** on [better404.dev](https://better404.dev)
2. **Verify ownership** with a DNS record (takes 2 minutes)
3. **Copy the snippet** to your 404 page
4. **Done!** Your site gets automatically crawled and indexed

When someone hits a 404, they see relevant pages from your site instead of a dead end.

## Two Ways to Use

### 🌐 Hosted Service (Recommended)
- **Free and open source**
- **Zero setup** - just paste a snippet
- **Automatic updates** when you add new content
- **No maintenance** required

### 🛠️ Self-Hosted
For full control over your data and infrastructure:
- **Requires**: [Kernel API key](https://dashboard.onkernel.com/api-keys), OpenAI API key, PostgreSQL with pgvector

## Key Features

- **Free & Open Source** - No cost, full source code available
- **Works on Any Site** - Just paste a snippet, no complex setup
- **AI-Powered Search** - Uses semantic search to find relevant content
- **Automatic Updates** - Re-crawls your site when content changes
- **No Analytics/Stats** - We just provide the recommendations, you handle tracking
- **Not Monetized** - Completely free service

## How It Works

1. **We crawl your site** - Uses [Kernel](https://onkernel.com) browsers to visit every page
2. **We index the content** - Creates a searchable database of your pages
3. **We provide recommendations** - When someone hits a 404, we find relevant pages
4. **You show the results** - Simple snippet displays helpful suggestions

## What You Get

- **A simple snippet** to paste into your 404 page
- **Automatic crawling** of your entire site
- **AI-powered recommendations** when users hit broken links
- **No setup required** - just verify domain ownership
- **No analytics** - you can add your own tracking to the links
- **Completely free** - no monetization, no paid tiers

## Architecture

- **Frontend**: Next.js App Router with TypeScript
- **Database**: PostgreSQL with pgvector extension for vector similarity search
- **Embeddings**: OpenAI API for generating semantic embeddings
- **Crawling**: [Kernel](https://onkernel.com) browsers for direct web scraping and content vectorization

## Quick Start

1. **Visit [better404.dev](https://better404.dev)**
2. **Enter your domain** (e.g., `example.com`)
3. **Add DNS verification record**:
   ```
   Name:    _better404.example.com
   Type:    TXT
   Value:   [your-site-key]
   ```
4. **Verify ownership** by clicking "Check verification"
5. **Copy the snippet** and paste it into your 404 page
6. **Done!** Your site gets automatically crawled and indexed

### Option 2: Self-Hosted Deployment

#### Prerequisites

- Node.js 18+ and Bun
- PostgreSQL with pgvector extension
- OpenAI API key
- Kernel API key
- Kernel CLI installed (`brew install onkernel/tap/kernel`)
- Hosting platform (Vercel, Railway, etc.)

#### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd better404
   bun install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   DATABASE_URL="postgres://user:password@localhost:5432/better404"
   OPENAI_API_KEY="sk-..."
   KERNEL_API_KEY="..."
   APP_BASE_URL="https://your-domain.com"
   TOP_N_DEFAULT="5"
   ```
3. **Set up the database**:
   ```bash
   # Run the migrations to create tables and enable pgvector
   bun run db:migrate
   ```

4. **Deploy the Kernel app** (required for crawling):
   ```bash
   cd src/lib/kernel-app
   kernel deploy index.ts --env-file ../../../.env
   ```
   
   This deploys the web scraping and content vectorization service that crawls your website and creates embeddings for the recommendation engine.

5. **Deploy to your hosting platform**:
   ```bash
   bun run build
   ```

6. **Start using**:
   Navigate to your deployed URL and follow the same steps as the hosted service

## API Endpoints

### Public API

- `POST /api/v1/recommendations` - Get 404 page recommendations
- `GET /api/v1/status/[domain]` - Check domain indexing status
- `POST /api/v1/domains` - Register a new domain
- `POST /api/v1/domains/[id]/verify` - Verify domain ownership

## Integration

### Using the Hosted Service

1. **Visit [better404.dev](https://better404.dev)**
2. **Enter your domain** and get your site key
3. **Add DNS verification** and verify ownership
4. **Copy the snippet** and paste it into your 404 page
5. **Done!** Crawling happens automatically

### Self-Hosted Integration

#### 1. Register Your Domain

```bash
curl -X POST https://your-domain.com/api/v1/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

#### 2. Add the Snippet to Your 404 Page

**HTML Version:**
```html
<div id="better404"></div>
<script>
(function(){
  const siteKey = "pk_live_xxx"; // Get this from your domain registration
  const url = location.href;
  const ref = document.referrer || null;
  fetch("https://your-domain.com/api/v1/recommendations",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({siteKey,url,referrer:ref,topN:5})
  }).then(r=>r.json()).then(({results})=>{
    const el=document.getElementById("better404");
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

**React Version:**
```tsx
import { Better404 } from './Better404';

export function NotFoundPage() {
  return (
    <div>
      <h1>Page Not Found</h1>
      <Better404 siteKey="pk_live_xxx" />
    </div>
  );
}
```

#### 3. Start Content Crawling

```bash
curl -X POST https://your-domain.com/api/internal/kernel/crawl \
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
    kernel-app/             # Kernel app for crawling and vectorization
    db.ts                   # Database client and helpers
    embeddings.ts           # Embedding provider wrapper
    urls.ts                 # URL normalization
    validation.ts           # Zod schemas
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
- **API Authentication**: Kernel API calls are authenticated using public site keys
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
