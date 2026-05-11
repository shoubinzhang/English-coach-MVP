"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { similarity, normalize } from "@/lib/shadowing";

type Sentence = { id: number; idx: number; text: string };

export default function ShadowSession({ params }: { params: { id: string } }) {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [title, setTitle] = useState("");
  const [idx, setIdx] = useState(0);
  const [heard, setHeard] = useState("");
  const [recording, setRecording] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [sttSupported, setSttSupported] = useState<boolean | null>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    fetch(`/api/shadowing/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setSentences(d.sentences);
        setTitle(d.source?.title ?? "");
      });
  }, [params.id]);

  useEffect(() => {
    const SR =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    setSttSupported(!!SR);
    if (!SR) return;
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setHeard(txt);
    };
    r.onend = () => {
      setRecording(false);
      // compute score on end
      setHeard((h) => {
        const target = sentences[idx]?.text ?? "";
        if (target && h) {
          setScore(Math.round(similarity(h, target) * 100));
        }
        return h;
      });
    };
    r.onerror = () => setRecording(false);
    recogRef.current = r;
  }, [sentences, idx]);

  function speak(text: string) {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function toggleMic() {
    const r = recogRef.current;
    if (!r) return;
    if (recording) {
      r.stop();
      return;
    }
    setHeard("");
    setScore(null);
    try {
      r.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }

  function next() {
    setIdx((i) => Math.min(i + 1, sentences.length - 1));
    setHeard("");
    setScore(null);
  }
  function prev() {
    setIdx((i) => Math.max(i - 1, 0));
    setHeard("");
    setScore(null);
  }

  if (sentences.length === 0) {
    return (
      <main className="container">
        <Link href="/shadowing">&larr; Back</Link>
        <h1>Loading…</h1>
      </main>
    );
  }

  const cur = sentences[idx];
  const targetNorm = normalize(cur.text);
  const heardNorm = normalize(heard);
  const targetWords = targetNorm.split(" ");
  const heardSet = new Set(heardNorm.split(" "));

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link href="/shadowing">&larr; Back</Link>
        <span className="muted">
          {idx + 1} / {sentences.length}
        </span>
      </div>
      <h1>{title}</h1>

      <div className="card">
        <h2>Target</h2>
        <p style={{ fontSize: "1.2rem", lineHeight: 1.6 }}>{cur.text}</p>
        <div className="row">
          <button onClick={() => speak(cur.text)}>🔊 Play</button>
          {sttSupported && (
            <button onClick={toggleMic} className={recording ? "danger" : "primary"}>
              {recording ? "Stop" : "🎤 Shadow it"}
            </button>
          )}
        </div>

        {heard && (
          <>
            <h2>You said</h2>
            <p style={{ fontSize: "1.05rem" }}>
              {targetWords.map((w, i) => (
                <span
                  key={i}
                  style={{
                    color: heardSet.has(w) ? "#15803d" : "#b91c1c",
                    fontWeight: heardSet.has(w) ? 500 : 600,
                  }}
                >
                  {w}{" "}
                </span>
              ))}
            </p>
            <p className="muted">Raw: {heard}</p>
            {score !== null && (
              <p>
                Score: <strong>{score}</strong> / 100
              </p>
            )}
          </>
        )}
      </div>

      <div className="spacer" />
      <div className="row">
        <button onClick={prev} disabled={idx === 0}>
          ← Prev
        </button>
        <button onClick={next} disabled={idx >= sentences.length - 1}>
          Next →
        </button>
      </div>
    </main>
  );
}
