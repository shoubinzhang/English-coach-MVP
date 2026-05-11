import { NextRequest, NextResponse } from "next/server";
import { getClient, MODEL, COACH_SYSTEM_PROMPT, COACH_SCHEMA } from "@/lib/claude";
import { getDb } from "@/lib/db";
import type { ChatTurn, CoachReply, Correction } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { history, userText } = (await req.json()) as {
    history: ChatTurn[];
    userText: string;
  };
  if (!userText?.trim()) {
    return NextResponse.json({ error: "empty userText" }, { status: 400 });
  }

  const client = getClient();
  const messages = [
    ...history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: userText },
  ];

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: COACH_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: COACH_SCHEMA },
    },
    messages,
  });

  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "no text response" }, { status: 500 });
  }

  let parsed: CoachReply;
  try {
    parsed = JSON.parse(textBlock.text) as CoachReply;
  } catch {
    return NextResponse.json({ error: "bad JSON from model", raw: textBlock.text }, { status: 502 });
  }

  if (parsed.corrections?.length) {
    const db = getDb();
    const insert = db.prepare(
      `INSERT INTO errors (original, corrected, category, explanation) VALUES (?, ?, ?, ?)`,
    );
    const tx = db.transaction((rows: Correction[]) => {
      for (const c of rows) insert.run(c.original, c.corrected, c.category, c.explanation);
    });
    tx(parsed.corrections);
  }

  return NextResponse.json(parsed);
}
