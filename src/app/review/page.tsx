"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ErrorRow } from "@/lib/types";

export default function ReviewPage() {
  const [queue, setQueue] = useState<ErrorRow[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/review");
    const data = (await res.json()) as { due: ErrorRow[]; total: number };
    setQueue(data.due);
    setTotal(data.total);
    setIdx(0);
    setRevealed(false);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function grade(q: 0 | 1 | 2 | 3) {
    const card = queue[idx];
    if (!card) return;
    await fetch("/api/review/grade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: card.id, q }),
    });
    if (idx + 1 >= queue.length) {
      await load();
    } else {
      setIdx(idx + 1);
      setRevealed(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <Link href="/">&larr; Home</Link>
        <h1>Review</h1>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (queue.length === 0) {
    return (
      <main className="container">
        <Link href="/">&larr; Home</Link>
        <h1>Review</h1>
        <p>Nothing due. {total === 0 ? "Start a conversation first." : `Total cards: ${total}.`}</p>
      </main>
    );
  }

  const card = queue[idx];

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link href="/">&larr; Home</Link>
        <span className="muted">
          {idx + 1} / {queue.length} due · {total} total
        </span>
      </div>
      <h1>Review</h1>

      <div className="card">
        <span className="tag">{card.category.replace("_", " ")}</span>
        <h2 style={{ marginTop: "0.5rem" }}>What&apos;s wrong here?</h2>
        <p style={{ fontSize: "1.1rem" }}>
          <span className="orig" style={{ color: "#b91c1c", textDecoration: "line-through" }}>
            {card.original}
          </span>
        </p>

        {!revealed ? (
          <button className="primary" onClick={() => setRevealed(true)}>
            Show answer
          </button>
        ) : (
          <>
            <p style={{ fontSize: "1.1rem", color: "#15803d", fontWeight: 600 }}>
              {card.corrected}
            </p>
            <p className="muted">{card.explanation}</p>
            <div className="spacer" />
            <p className="muted">How well did you remember it?</p>
            <div className="row">
              <button className="danger" onClick={() => grade(0)}>
                Again
              </button>
              <button onClick={() => grade(1)}>Hard</button>
              <button onClick={() => grade(2)}>Good</button>
              <button className="primary" onClick={() => grade(3)}>
                Easy
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
