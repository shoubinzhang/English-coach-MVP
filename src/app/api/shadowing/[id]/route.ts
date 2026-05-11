import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const db = getDb();
  const source = db
    .prepare(`SELECT id, title, url FROM shadowing_sources WHERE id = ?`)
    .get(id) as { id: number; title: string; url: string } | undefined;
  if (!source) return NextResponse.json({ error: "not found" }, { status: 404 });
  const sentences = db
    .prepare(`SELECT id, idx, text FROM shadowing_sentences WHERE source_id = ? ORDER BY idx`)
    .all(id);
  return NextResponse.json({ source, sentences });
}
