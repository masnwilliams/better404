import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { startKernelScrape, buildSnippet } from "@/lib/kernel";
import { normalizeDomain } from "@/lib/urls";

function randomId(len = 24) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string") return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    const normalized = normalizeDomain(name.toLowerCase());

    // Attempt insert; on conflict by name, update timestamp and return existing row (upsert)
    const siteKeyPublicCandidate = `pk_${randomId(28)}`;
    const siteKeySaltCandidate = randomId(40);
    const res = await query<{ id: number; site_key_public: string; verified: boolean }>(
      `INSERT INTO domains (name, site_key_public, site_key_salt, verified)
       VALUES ($1,$2,$3,false)
       ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
       RETURNING id, site_key_public, verified`,
      [normalized, siteKeyPublicCandidate, siteKeySaltCandidate]
    );
    const row = res.rows[0];
    const id = row.id;

    // Fire-and-forget scrape kickoff
    startKernelScrape(normalized).catch(() => {});
    const snippet = buildSnippet(row.site_key_public);
    return NextResponse.json({ id, name: normalized, siteKeyPublic: row.site_key_public, snippet, verify: { dns: `_404-verify.${normalized} TXT ${row.site_key_public}` } });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}


