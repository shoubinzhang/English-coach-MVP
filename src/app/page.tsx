import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <h1>English Coach</h1>
      <p className="muted">Personal coaching MVP — built around four modes.</p>

      <div className="spacer" />

      <div className="col" style={{ gap: "0.75rem" }}>
        <ModeCard
          href="/chat"
          title="1. Conversation"
          desc="Speak. I reply. Errors get logged and corrected on the side."
        />
        <ModeCard
          href="/review"
          title="2. Review (SRS)"
          desc="Flashcards from your logged errors. Spaced repetition."
        />
        <ModeCard
          href="/shadowing"
          title="3. Shadowing"
          desc="Paste a script, repeat one sentence at a time, get scored."
        />
        <ModeCard
          href="/pronunciation"
          title="4. Pronunciation"
          desc="Read a prompt. Get phoneme-level feedback (needs Azure)."
        />
      </div>
    </main>
  );
}

function ModeCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="card" style={{ display: "block", color: "inherit" }}>
      <strong>{title}</strong>
      <div className="muted">{desc}</div>
    </Link>
  );
}
