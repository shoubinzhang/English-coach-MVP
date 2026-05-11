# English Coach MVP

Four modes, one app:

1. **Conversation** — Speak; Claude replies and logs your errors.
2. **Review** — SRS flashcards from those errors.
3. **Shadowing** — Paste a script, repeat sentence-by-sentence, get scored.
4. **Pronunciation** — Azure Speech phoneme-level scoring.

## Stack

- Next.js 14 (App Router) + TypeScript
- SQLite via Node's built-in `node:sqlite` (file at `./data/coach.db`)
- Talks to Claude via either the **Anthropic API SDK** (with `ANTHROPIC_API_KEY`) or the **Claude Agent SDK** (using a local `claude login` Pro/Max subscription)
- Web Speech API for browser STT/TTS (free, Chrome/Edge only)
- Azure Speech SDK for pronunciation assessment (M4 only)

## Setup

```bash
npm install
cp .env.example .env
```

Then **pick one** auth option and edit `.env`:

### Option A — Anthropic API key (pay-as-you-go)

1. Sign up at <https://console.anthropic.com>, add a billing method, create a key.
2. In `.env`, set `ANTHROPIC_API_KEY=sk-ant-...`.
3. You get schema-enforced JSON output and prompt caching, which makes each conversation turn cheaper than the first.

### Option B — Your Claude Pro/Max subscription via Claude Code CLI

If you already pay for Claude.ai Pro or Max and only want to run this locally:

```bash
npm install -g @anthropic-ai/claude-code
claude login                  # browser opens, sign in
```

Leave `ANTHROPIC_API_KEY` **unset** (or commented out) in `.env`. The app's `/api/chat` route detects the missing key and falls back to the Claude Agent SDK, which reuses your `claude login` credentials. No API billing.

On Windows the install + login is the same, just run them in cmd / PowerShell.

> Note: this is fine for personal local use. If you turn the app into something hosted for others, you'll need an API key — subscription auth is per-user.

### Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000> in **Chrome or Edge** (Web Speech API isn't in Firefox/Safari).

## Cost

| Option | Per-month cost (30 min/day chat) |
|---|---|
| Anthropic API + `claude-opus-4-7` | ~$3–8 |
| Anthropic API + `claude-sonnet-4-6` (set in `src/lib/claude.ts`) | ~$1–3 |
| Pro/Max subscription via Agent SDK | $0 extra (subscription counts) |

## Future: YouTube import for Shadowing

The current shadowing flow accepts pasted scripts. To support `yt-dlp` import:

1. `npm i yt-dlp-wrap` (or shell-out to a `yt-dlp` binary).
2. In `src/app/api/shadowing/import/route.ts`, if `url` is provided, download subtitles + audio.
3. Use the subtitle timestamps to populate `start_ms` / `end_ms` on `shadowing_sentences`.
4. Serve audio chunks via a new `/api/shadowing/<id>/audio/<idx>` route and play them in the session UI.

## Other paid upgrade paths

| Mode | Default (free) | Upgrade |
|------|----------------|---------|
| STT  | Web Speech API | Whisper API (`~$0.006/min`) |
| TTS  | browser SpeechSynthesis | OpenAI TTS (`~$15/1M chars`) |
| Pronunciation | none (browser can't do phonemes) | Azure Speech (free tier ~5h/month) |
