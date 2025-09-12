import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    // For MVP, mark verified immediately. Later: DNS/HTML check.
    const res = await query("UPDATE domains SET verified = true, updated_at = NOW() WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}


