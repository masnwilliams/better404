import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

async function lookupTxt(host: string): Promise<string[] | null> {
  // Minimal DNS-over-HTTPS TXT lookup using Cloudflare
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=TXT`;
    const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
    if (!res.ok) return null;
    const j = await res.json();
    const answers = Array.isArray(j.Answer) ? j.Answer : [];
    const txts: string[] = [];
    for (const a of answers) {
      if (a.type === 16 && typeof a.data === "string") {
        const s = a.data.replace(/^"|"$/g, "").trim();
        if (s) txts.push(s);
      }
    }
    return txts;
  } catch { return null; }
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const dres = await query<{ id: number; name: string; site_key_public: string; verified: boolean }>(
      "SELECT id, name, site_key_public, verified FROM domains WHERE id = $1",
      [id]
    );
    if (dres.rows.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const row = dres.rows[0];
    if (row.verified) return NextResponse.json({ verified: true });

    const host = `_404-verify.${row.name}`;
    const txts = await lookupTxt(host);
    if (!txts || !txts.includes(row.site_key_public)) {
      return NextResponse.json({ verified: false, reason: "txt_record_not_found" }, { status: 400 });
    }

    await query("UPDATE domains SET verified = true, updated_at = NOW() WHERE id = $1", [row.id]);
    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
