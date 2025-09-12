import { Kernel } from '@onkernel/sdk';

export async function startKernelScrape(domain: string): Promise<{ ok: boolean }>{
  const baseURL = 'https://api.onkernel.com';
  const apiKey = process.env.KERNEL_API_KEY;
  const appName = '404-solver';
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

export function buildSnippet(siteKeyPublic: string): string {
  const apiBase = process.env.APP_BASE_URL || "";
  const recUrl = `${apiBase.replace(/\/$/, "")}/api/v1/recommendations`;
  return (
    `<div id="smart-404"></div>\n` +
    `<script>(function(){const siteKey="${siteKeyPublic}";const url=location.href;const ref=document.referrer||null;` +
    `fetch("${recUrl}",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({siteKey,url,referrer:ref,topN:5})})` +
    `.then(r=>r.json()).then(({results})=>{const el=document.getElementById("smart-404");if(!el||!Array.isArray(results))return;` +
    `el.innerHTML=\``+
    `<div style="margin:16px 0"><h2 style="margin:0 0 8px">Were you looking for one of these?</h2>`+
    `<ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">`+
    `\${results.map(r=>\`<li><a href=\"\${r.url}\">\${r.title||r.url}</a><div style=\"opacity:.7\">\${r.snippet||""}</div></li>\`).join("")}`+
    `</ul></div>\``+
    `;}).catch(()=>{});})();</script>`
  );
}


