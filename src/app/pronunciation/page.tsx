"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WordScore = {
  word: string;
  accuracy: number;
  errorType: string;
  phonemes: { phoneme: string; accuracy: number }[];
};

type Result = {
  accuracy: number;
  fluency: number;
  completeness: number;
  pron: number;
  words: WordScore[];
};

const PROMPTS = [
  "The quick brown fox jumps over the lazy dog.",
  "She sells seashells by the seashore.",
  "I'd like a black coffee, no sugar, please.",
  "Could you tell me the way to the train station?",
  "Although it was raining, we decided to go for a walk.",
];

export default function PronunciationPage() {
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [result, setResult] = useState<Result | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/pronunciation/token")
      .then((r) => (r.ok ? r.json() : r.json().then((e) => Promise.reject(e))))
      .then(() => setSupported(true))
      .catch((e) => {
        setSupported(false);
        setError(e?.error ?? "Azure Speech not configured");
      });
  }, []);

  async function start() {
    setError(null);
    setResult(null);
    setRecording(true);
    try {
      const tokenRes = await fetch("/api/pronunciation/token");
      if (!tokenRes.ok) throw new Error("token");
      const { token, region } = await tokenRes.json();

      // Dynamic import — the SDK is large and only needed here.
      const sdk = await import("microsoft-cognitiveservices-speech-sdk");
      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "en-US";

      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      const paConfig = new sdk.PronunciationAssessmentConfig(
        prompt,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true,
      );
      paConfig.applyTo(recognizer);

      recognizer.recognizeOnceAsync(
        (r) => {
          setRecording(false);
          if (r.reason !== sdk.ResultReason.RecognizedSpeech) {
            setError(`No speech recognized (${sdk.ResultReason[r.reason]}).`);
            recognizer.close();
            return;
          }
          const paResult = sdk.PronunciationAssessmentResult.fromResult(r);
          const json = JSON.parse(r.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult));
          const words: WordScore[] = (json?.NBest?.[0]?.Words ?? []).map((w: any) => ({
            word: w.Word,
            accuracy: w.PronunciationAssessment?.AccuracyScore ?? 0,
            errorType: w.PronunciationAssessment?.ErrorType ?? "None",
            phonemes: (w.Phonemes ?? []).map((p: any) => ({
              phoneme: p.Phoneme,
              accuracy: p.PronunciationAssessment?.AccuracyScore ?? 0,
            })),
          }));
          setResult({
            accuracy: paResult.accuracyScore,
            fluency: paResult.fluencyScore,
            completeness: paResult.completenessScore,
            pron: paResult.pronunciationScore,
            words,
          });
          recognizer.close();
        },
        (err) => {
          setRecording(false);
          setError(err);
          recognizer.close();
        },
      );
    } catch (e: any) {
      setRecording(false);
      setError(e?.message ?? String(e));
    }
  }

  return (
    <main className="container">
      <Link href="/">&larr; Home</Link>
      <h1>Pronunciation</h1>
      <p className="muted">
        Phoneme-level scoring via Azure Speech. Needs <code>AZURE_SPEECH_KEY</code> +{" "}
        <code>AZURE_SPEECH_REGION</code> set in <code>.env</code>.
      </p>

      {supported === false && (
        <div className="card" style={{ borderColor: "#fbbf24", background: "#fffbeb" }}>
          <strong>Azure not configured.</strong>
          <p className="muted">{error}</p>
          <p>
            Sign up for a free Azure Speech resource (free tier includes ~5 hours/month of
            pronunciation assessment), set the env vars, and reload.
          </p>
        </div>
      )}

      <h2>Prompt</h2>
      <div className="card">
        <select value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ width: "100%", padding: "0.5rem" }}>
          {PROMPTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <p style={{ fontSize: "1.2rem" }}>{prompt}</p>
        <button className="primary" onClick={start} disabled={recording || supported !== true}>
          {recording ? "Listening…" : "🎤 Read it"}
        </button>
      </div>

      {error && supported && (
        <p style={{ color: "#b91c1c" }}>{String(error)}</p>
      )}

      {result && (
        <>
          <h2>Scores</h2>
          <div className="card">
            <div className="row" style={{ gap: "1.5rem" }}>
              <Score label="Overall" value={result.pron} />
              <Score label="Accuracy" value={result.accuracy} />
              <Score label="Fluency" value={result.fluency} />
              <Score label="Completeness" value={result.completeness} />
            </div>
            <div className="spacer" />
            <h2 style={{ margin: 0 }}>Words</h2>
            <p style={{ fontSize: "1.2rem", lineHeight: 1.8 }}>
              {result.words.map((w, i) => (
                <span key={i} title={`${w.accuracy.toFixed(0)} · ${w.errorType}`} style={{ color: colorFor(w.accuracy), marginRight: 6 }}>
                  {w.word}
                </span>
              ))}
            </p>
            <h2 style={{ margin: 0 }}>Weakest phonemes</h2>
            <ul>
              {weakest(result.words).map((p, i) => (
                <li key={i}>
                  <code>{p.phoneme}</code> — {p.accuracy.toFixed(0)} ({p.word})
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </main>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: "0.8rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colorFor(value) }}>
        {value?.toFixed(0) ?? "-"}
      </div>
    </div>
  );
}

function colorFor(score: number): string {
  if (score >= 80) return "#15803d";
  if (score >= 60) return "#ca8a04";
  return "#b91c1c";
}

function weakest(words: WordScore[]) {
  const all = words.flatMap((w) =>
    w.phonemes.map((p) => ({ word: w.word, phoneme: p.phoneme, accuracy: p.accuracy })),
  );
  return all.sort((a, b) => a.accuracy - b.accuracy).slice(0, 8);
}
