import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { ErrorRow } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM errors WHERE due_at <= datetime('now') ORDER BY due_at ASC LIMIT 20`,
    )
    .all() as ErrorRow[];
  const totalRow = db.prepare(`SELECT COUNT(*) as n FROM errors`).get() as { n: number };
  return NextResponse.json({ due: rows, total: totalRow.n });
}
