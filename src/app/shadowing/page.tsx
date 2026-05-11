"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Source = { id: number; title: string; created_at: string; count: number };

export default function ShadowingIndex() {
  const [sources, setSources] = useState<Source[]>([]);
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/shadowing/import");
    const d = await r.json();
    setSources(d.sources ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function importScript() {
    if (!title.trim() || !script.trim()) return;
    setBusy(true);
    const r = await fetch("/api/shadowing/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, script }),
    });
    setBusy(false);
    if (r.ok) {
      setTitle("");
      setScript("");
      load();
    }
  }

  return (
    <main className="container">
      <Link href="/">&larr; Home</Link>
      <h1>Shadowing</h1>
      <p className="muted">
        Paste any script (transcript, podcast text, book paragraph). The app splits it into
        sentences and runs a shadowing loop — listen, repeat, get scored on similarity.
      </p>

      <h2>Import</h2>
      <div className="card col">
        <input
          type="text"
          placeholder="Title (e.g. 'TED talk: Procrastination')"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          rows={8}
          placeholder="Paste the script here. Plain English text, periods separate sentences."
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />
        <div>
          <button className="primary" onClick={importScript} disabled={busy || !title || !script}>
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          YouTube import via yt-dlp can be added later — see the README.
        </p>
      </div>

      <h2>Your scripts</h2>
      {sources.length === 0 ? (
        <p className="muted">Nothing yet.</p>
      ) : (
        <div className="col">
          {sources.map((s) => (
            <Link key={s.id} href={`/shadowing/${s.id}`} className="card" style={{ display: "block", color: "inherit" }}>
              <strong>{s.title}</strong>
              <div className="muted">
                {s.count} sentences · {new Date(s.created_at).toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
