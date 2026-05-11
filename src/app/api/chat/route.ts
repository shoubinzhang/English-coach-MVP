import { NextRequest, NextResponse } from "next/server";
import { coach } from "@/lib/claude";
import { getDb, tx } from "@/lib/db";
import type { ChatTurn } from "@/lib/types";

export const runtime = "nodejs";

const authPath = (() => {
  if (process.env.GEMINI_API_KEY) return "Gemini (gemini-2.5-flash)";
  if (/^sk-ant-[a-zA-Z0-9_-]{40,}$/.test(process.env.ANTHROPIC_API_KEY ?? ""))
    return "Anthropic API key (claude-opus-4-7)";
  return "Claude Agent SDK (claude login)";
})();
console.log(`[coach] auth: ${authPath}`);

export async function POST(req: NextRequest) {
  const { history, userText } = (await req.json()) as {
    history: ChatTurn[];
    userText: string;
  };
  if (!userText?.trim()) {
    return NextResponse.json({ error: "empty userText" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = await coach(history, userText);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (parsed.corrections?.length) {
    const db = getDb();
    const insert = db.prepare(
      `INSERT INTO errors (original, corrected, category, explanation) VALUES (?, ?, ?, ?)`,
    );
    tx(() => {
      for (const c of parsed.corrections) {
        insert.run(c.original, c.corrected, c.category, c.explanation);
      }
    });
  }

  return NextResponse.json(parsed);
}
