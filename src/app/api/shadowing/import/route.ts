import { NextRequest, NextResponse } from "next/server";
import { getDb, tx } from "@/lib/db";
import { splitSentences } from "@/lib/shadowing";

export const runtime = "nodejs";

// MVP: accept a pasted title + script. (Future: YouTube URL via yt-dlp.)
export async function POST(req: NextRequest) {
  const { title, script, url } = (await req.json()) as {
    title: string;
    script: string;
    url?: string;
  };
  if (!title?.trim() || !script?.trim()) {
    return NextResponse.json({ error: "title and script required" }, { status: 400 });
  }

  const db = getDb();
  const insertSrc = db.prepare(`INSERT INTO shadowing_sources (url, title) VALUES (?, ?)`);
  const insertSent = db.prepare(
    `INSERT INTO shadowing_sentences (source_id, idx, text) VALUES (?, ?, ?)`,
  );

  const sentences = splitSentences(script);
  const sourceId = tx(() => {
    const info = insertSrc.run(url ?? "", title.trim());
    const id = Number(info.lastInsertRowid);
    sentences.forEach((s, i) => insertSent.run(id, i, s));
    return id;
  });
  return NextResponse.json({ ok: true, sourceId, count: sentences.length });
}

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.id, s.title, s.created_at, COUNT(sent.id) as count
       FROM shadowing_sources s
       LEFT JOIN shadowing_sentences sent ON sent.source_id = s.id
       GROUP BY s.id ORDER BY s.id DESC`,
    )
    .all();
  return NextResponse.json({ sources: rows });
}
