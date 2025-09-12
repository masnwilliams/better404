import { Kernel } from '@onkernel/sdk';

export async function startKernelScrape(domain: string): Promise<{ ok: boolean }>{
  const baseURL = 'https://api.onkernel.com';
  const apiKey = process.env.KERNEL_API_KEY;
  const appName = 'better404';
  if (!baseURL || !apiKey) return { ok: false };
  try {
    const client = new Kernel({ apiKey, baseURL });
    console.log(`[kernel.invoke] app=${appName} domain=${domain}`);
    const inv = await client.invocations.create({
      app_name: appName,
      action_name: 'crawl-domain',
      payload: JSON.stringify({ domain }),
      version: 'latest',
      async: true,
    });
    console.log(`[kernel.invoke] queued id=${inv.id} status=${inv.status}`);
    // Follow logs in background (non-blocking)
    ;(async () => {
      try {
        const stream = await client.invocations.follow(inv.id);
        for await (const evt of stream) {
          if (evt.event === 'log') {
            const msg = (evt.message || '').replace(/\n$/, '');
            console.log(`[kernel.log][${inv.id}] ${msg}`);
          } else if (evt.event === 'invocation_state') {
            const status = evt.invocation?.status;
            console.log(`[kernel.state][${inv.id}] ${status}`);
            if (status === 'succeeded' || status === 'failed') break;
          }
        }
      } catch (e) {
        console.log(`[kernel.follow] error id=${inv.id} err=${e instanceof Error ? e.message : String(e)}`);
      }
    })();
    return { ok: true };
  } catch (e) {
    console.log(`[kernel.invoke] error domain=${domain} err=${e instanceof Error ? e.message : String(e)}`);
    return { ok: false };
  }
}

export function buildSnippet(siteKeyPublic: string): { html: string; react: string } {
  const apiBase = process.env.APP_BASE_URL || "";
  const recUrl = `${apiBase.replace(/\/$/, "")}/api/v1/recommendations`;
  
  const htmlSnippet = `<div id="better404"></div>
<script>
(function(){
  const siteKey="${siteKeyPublic}";
  // Get URL from parent window if in iframe, otherwise current window
  let url = location.href;
  if (window.parent !== window) {
    // Try to get URL from parent window or referrer
    try {
      url = window.parent.location.href;
    } catch {
      // Cross-origin restriction, fall back to referrer
      url = document.referrer || location.href;
    }
  }
  const ref=document.referrer||undefined;
  
  fetch("${recUrl}",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({siteKey,url,referrer:ref,topN:5})
  })
  .then(r=>r.json())
  .then(({results})=>{
    const el=document.getElementById("better404");
    if(!el||!Array.isArray(results))return;
    
    el.innerHTML=\`
      <div class="better404-container" style="
        margin: 2rem 0;
        padding: 1.5rem;
        border-radius: 8px;
        background: inherit;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
      ">
        <h2 class="better404-title" style="
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: inherit;
        ">Were you looking for one of these?</h2>
        <ul class="better404-list" style="
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0.75rem;
        ">
          \${results.map(r=>\`
            <li class="better404-item" style="
              padding: 0.75rem;
              border-radius: 6px;
              background: rgba(0,0,0,0.02);
              border: 1px solid rgba(0,0,0,0.1);
              transition: all 0.2s ease;
            ">
              <a href="\${r.url}" style="
                text-decoration: none;
                color: inherit;
                font-weight: 500;
                display: block;
                margin-bottom: 0.25rem;
              ">\${r.title||r.url}</a>
              <!-- <div class="better404-snippet" style="
                opacity: 0.7;
                font-size: 0.875rem;
                color: inherit;
              ">\${r.snippet||""}</div> -->
            </li>
          \`).join("")}
        </ul>
      </div>
    \`;
    
    // Add hover effects
    const items = el.querySelectorAll('.better404-item');
    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(0,0,0,0.05)';
        item.style.transform = 'translateY(-1px)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'rgba(0,0,0,0.02)';
        item.style.transform = 'translateY(0)';
      });
    });
  })
  .catch(()=>{});
})();
</script>`;

  const reactSnippet = `import { useEffect, useState } from 'react';

interface Recommendation {
  url: string;
  title: string | null;
  snippet: string | null;
  score: number;
}

export function Better404({ siteKey }: { siteKey: string }) {
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch('${recUrl}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteKey,
            url: (() => {
              if (window.parent !== window) {
                try {
                  return window.parent.location.href;
                } catch {
                  return document.referrer || window.location.href;
                }
              }
              return window.location.href;
            })(),
            referrer: document.referrer || undefined,
            topN: 5
          })
        });
        const { results } = await response.json();
        setResults(results || []);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [siteKey]);

  if (loading) return null;
  if (!results.length) return null;

  return (
    <div className="better404-container" style={{
      margin: '2rem 0',
      padding: '1.5rem',
      borderRadius: '8px',
      background: 'inherit',
      color: 'inherit',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: 'inherit'
    }}>
      <h2 className="better404-title" style={{
        margin: '0 0 1rem 0',
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'inherit'
      }}>
        Were you looking for one of these?
      </h2>
      <ul className="better404-list" style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'grid',
        gap: '0.75rem'
      }}>
        {results.map((result, index) => (
          <li key={index} className="better404-item" style={{
            padding: '0.75rem',
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}>
            <a 
              href={result.url}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 500,
                display: 'block',
                marginBottom: '0.25rem'
              }}
            >
              {result.title || result.url}
            </a>
            {/* {result.snippet && (
              <div className="better404-snippet" style={{
                opacity: 0.7,
                fontSize: '0.875rem',
                color: 'inherit'
              }}>
                {result.snippet}
              </div>
            )} */}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Usage: <Better404 siteKey="${siteKeyPublic}" />`;

  return { html: htmlSnippet, react: reactSnippet };
}


