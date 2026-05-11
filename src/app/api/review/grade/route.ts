import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { grade, nextDueAt } from "@/lib/srs";
import type { ErrorRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { id, q } = (await req.json()) as { id: number; q: 0 | 1 | 2 | 3 };
  if (typeof id !== "number" || ![0, 1, 2, 3].includes(q)) {
    return NextResponse.json({ error: "bad params" }, { status: 400 });
  }
  const db = getDb();
  const row = db.prepare(`SELECT * FROM errors WHERE id = ?`).get(id) as ErrorRow | undefined;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const next = grade(
    { ease: row.ease, interval_days: row.interval_days, reps: row.reps, lapses: row.lapses },
    q,
  );
  const due = nextDueAt(next.interval_days);
  db.prepare(
    `UPDATE errors SET ease=?, interval_days=?, reps=?, lapses=?, due_at=? WHERE id=?`,
  ).run(next.ease, next.interval_days, next.reps, next.lapses, due, id);

  return NextResponse.json({ ok: true, next: { ...next, due_at: due } });
}
