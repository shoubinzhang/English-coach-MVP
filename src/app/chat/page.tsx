"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChatTurn, CoachReply, Correction } from "@/lib/types";

type Turn = ChatTurn & { corrections?: Correction[] };

const STT_LOCALES: { code: string; label: string }[] = [
  { code: "en-US", label: "English (US)" },
  { code: "en-IN", label: "English (India) — often handles Asian accents better" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-AU", label: "English (Australia)" },
];

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [sttSupported, setSttSupported] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const [sttLang, setSttLang] = useState("en-US");
  const [heardSomething, setHeardSomething] = useState(false);
  const recogRef = useRef<any>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Restore the user's last STT locale on mount.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("stt-lang") : null;
    if (saved && STT_LOCALES.some((l) => l.code === saved)) setSttLang(saved);
  }, []);

  useEffect(() => {
    const SR =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null;
    setSttSupported(!!SR);
    if (!SR) return;
    const r = new SR();
    r.lang = sttLang;
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e: any) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      if (txt) setHeardSomething(true);
      setDraft(txt);
    };
    r.onend = () => setRecording(false);
    r.onerror = () => setRecording(false);
    recogRef.current = r;
  }, [sttLang]);

  function changeLang(code: string) {
    setSttLang(code);
    if (typeof window !== "undefined") localStorage.setItem("stt-lang", code);
  }

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [turns]);

  function speak(text: string) {
    if (!ttsOn || typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.95;
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
    setDraft("");
    setHeardSomething(false);
    try {
      r.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft("");
    const history: ChatTurn[] = turns.map(({ role, content }) => ({ role, content }));
    const userTurn: Turn = { role: "user", content: text };
    setTurns((t) => [...t, userTurn]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history, userText: text }),
      });
      if (!res.ok) {
        const err = await res.text();
        setTurns((t) => [...t, { role: "assistant", content: `[error] ${err}` }]);
        return;
      }
      const data = (await res.json()) as CoachReply;
      setTurns((t) => [
        ...t,
        { role: "assistant", content: data.reply, corrections: data.corrections },
      ]);
      speak(data.reply);
    } catch (e: any) {
      setTurns((t) => [...t, { role: "assistant", content: `[error] ${e?.message ?? e}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link href="/">&larr; Home</Link>
        <div className="row">
          <label className="row" style={{ gap: "0.3rem" }}>
            <input
              type="checkbox"
              checked={ttsOn}
              onChange={(e) => setTtsOn(e.target.checked)}
            />
            speak replies
          </label>
        </div>
      </div>

      <h1>Conversation</h1>
      <p className="muted">
        {sttSupported === false
          ? "Your browser doesn't support speech recognition — type instead."
          : "Tap the mic, talk, then press Send. Replies appear with corrections on the right."}
      </p>

      <div ref={chatRef} className="chat">
        {turns.length === 0 && (
          <div className="muted" style={{ padding: "0.5rem" }}>
            Start with something simple — &ldquo;Hey, how was your weekend?&rdquo;
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <div className={`bubble ${t.role}`}>{t.content}</div>
            {t.corrections && t.corrections.length > 0 && (
              <div style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
                {t.corrections.map((c, j) => (
                  <div key={j} className="correction">
                    <div className="cat">{c.category.replace("_", " ")}</div>
                    <div>
                      <span className="orig">{c.original}</span>{" "}
                      <span>&rarr;</span>{" "}
                      <span className="fixed">{c.corrected}</span>
                    </div>
                    <div className="muted">{c.explanation}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="spacer" />

      {sttSupported && (
        <div className="row" style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}>
          <span className="muted">Speech accent:</span>
          <select
            value={sttLang}
            onChange={(e) => changeLang(e.target.value)}
            style={{ padding: "0.25rem 0.5rem" }}
          >
            {STT_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          {!recording && draft === "" && !heardSomething && turns.length > 0 && (
            <span className="muted" style={{ fontSize: "0.75rem" }}>
              No audio captured last time? Try a different accent, speak louder, or check
              mic permission.
            </span>
          )}
        </div>
      )}

      <div className="row">
        {sttSupported && (
          <button
            onClick={toggleMic}
            className={recording ? "danger" : ""}
            disabled={busy}
            aria-label={recording ? "Stop recording" : "Start recording"}
          >
            {recording ? "● Listening…" : "🎤 Mic"}
          </button>
        )}
        <input
          type="text"
          value={draft}
          placeholder={recording ? "Speak slowly and clearly…" : "Type or speak…"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          style={{ flex: 1, minWidth: 200 }}
          disabled={busy}
        />
        <button className="primary" onClick={send} disabled={busy || !draft.trim()}>
          {busy ? "…" : "Send"}
        </button>
      </div>
    </main>
  );
}
