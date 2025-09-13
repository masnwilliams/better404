import { Kernel } from '@onkernel/sdk';
import { mkdtempSync, rmSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export async function startKernelScrape(domain: string): Promise<{ ok: boolean }>{
  const baseURL = 'https://api.onkernel.com';
  const apiKey = process.env.KERNEL_API_KEY;
  if (!baseURL || !apiKey) return { ok: false };

  const APP_PREFIX = 'better404';
  const APP_PER_DOMAIN = true;
  const SHARD_COUNT = 5;

  const sanitizedDomain = domain.toLowerCase().replace(/[^a-z0-9.-]/g, '').replace(/\.+/g, '.');
  const appName = APP_PER_DOMAIN ? `${APP_PREFIX}-${sanitizedDomain.replace(/\./g, '-')}` : APP_PREFIX;
  try {
    const client = new Kernel({ apiKey, baseURL });

    // Ensure per-domain app exists; if not, deploy it with APP_NAME env set
    try {
      const tmp = mkdtempSync(join(tmpdir(), 'kernel-app-'));
      try {
        const appDir = resolve(process.cwd(), 'src', 'lib', 'kernel-app');
        const zipPath = join(tmp, 'app.zip');
        const zipProc = spawnSync('zip', ['-r', '-q', zipPath, '.'], { cwd: appDir });
        if (zipProc.status !== 0) {
          throw new Error(`zip failed: ${zipProc.stderr?.toString() || 'unknown error'}`);
        }
        const file = createReadStream(zipPath);
        const envVars: Record<string, string> = { APP_NAME: appName };
        if (process.env.DATABASE_URL) envVars.DATABASE_URL = process.env.DATABASE_URL as string;
        if (process.env.OPENAI_API_KEY) envVars.OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;

          console.log(`[kernel.deploy] creating app=${appName}`);
          const dep = await client.deployments.create({
            entrypoint_rel_path: 'index.ts',
            file,
            env_vars: envVars,
            force: true,
            version: 'latest',
          });
          console.log(`[kernel.deploy] id=${dep.id} status=${dep.status}`);
          
          // Follow deployment logs until it succeeds or fails
          const stream = await client.deployments.follow(dep.id);
          for await (const ev of stream) {
            const e = ev;
            if (e.event === 'deployment_state') {
              const st = e.deployment?.status as string | undefined;
              console.log(`[kernel.deploy] status=${st}`);
              if (st === 'running') break;
              if (st === 'failed' || st === 'stopped') {
                throw new Error(`deployment ended with status ${st}`);
              }
            }
            if (e.event === 'log' && e.message) {
              console.log(`[kernel.deploy] ${String(e.message).trimEnd()}`);
            }
          }
          console.log(`[kernel.deploy] app=${appName} ready`);
      } finally {
        try { rmSync(tmp, { recursive: true, force: true }); } catch {}
      }
    } catch (e) {
      console.log(`[kernel.deploy] error app=${appName} err=${e instanceof Error ? e.message : String(e)}`);
    }

    console.log(`[kernel.invoke] app=${appName} domain=${domain} shards=${SHARD_COUNT}`);

    const invocations = await Promise.all(
      Array.from({ length: SHARD_COUNT }, async (_v, shardIndex) => {
        const inv = await client.invocations.create({
          app_name: appName,
          action_name: 'crawl-domain',
          payload: JSON.stringify({ domain, shardIndex, shardCount: SHARD_COUNT }),
          version: 'latest',
          async: true,
        });
        console.log(`[kernel.invoke] queued id=${inv.id} shard=${shardIndex}/${SHARD_COUNT}`);
        return inv;
      })
    );

    for (const inv of invocations) {
      (async () => {
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
    }
    return { ok: true };
  } catch (e) {
    console.log(`[kernel.invoke] error domain=${domain} err=${e instanceof Error ? e.message : String(e)}`);
    return { ok: false };
  }
}


