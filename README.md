# English Coach MVP

Four modes, one app:

1. **Conversation** — Speak; Claude replies and logs your errors.
2. **Review** — SRS flashcards from those errors.
3. **Shadowing** — Paste a script, repeat sentence-by-sentence, get scored.
4. **Pronunciation** — Azure Speech phoneme-level scoring.

## Stack

- Next.js 14 (App Router) + TypeScript
- SQLite via Node's built-in `node:sqlite` (file at `./data/coach.db`)
- Three model-auth paths (priority: Gemini > Anthropic API key > Claude Agent SDK)
- Web Speech API for browser STT/TTS (free, Chrome/Edge only)
- Azure Speech SDK for pronunciation assessment (M4 only)

## Setup

```bash
npm install
cp .env.example .env
```

Then pick **one** auth option:

### Option A — Google Gemini 2.5 Flash (free, no card)

1. Sign in at <https://aistudio.google.com> with any Google account.
2. Top-left "Get API key" → create one.
3. In `.env`: `GEMINI_API_KEY=your-key-here`.

Free tier (~15 RPM, 1M tokens/min) is plenty for personal use.

### Option B — Anthropic API key (pay-as-you-go, best quality)

1. Sign up at <https://console.anthropic.com>, add a card, create a key.
2. In `.env`: `ANTHROPIC_API_KEY=sk-ant-...`.

Schema-enforced JSON output and prompt caching. ~$3-8/month at 30 min/day with `claude-opus-4-7`.

### Option C — Your Claude Pro/Max subscription (no extra cost)

```bash
npm install -g @anthropic-ai/claude-code
claude login           # opens browser, sign in
```

Leave **both** `GEMINI_API_KEY` and `ANTHROPIC_API_KEY` unset in `.env`. The app falls back to the Claude Agent SDK, which reuses the local `claude login` credentials.

> **Windows gotcha** — npm publishes an empty `claude-agent-sdk-win32-x64@0.0.0` as the "latest" tag. The package.json here pins `0.2.138` (with the actual binary) in `optionalDependencies` so `npm install` grabs the right one. If you accidentally ran `npm install @anthropic-ai/claude-agent-sdk-win32-x64` (no version), reinstall with `npm install @anthropic-ai/claude-agent-sdk-win32-x64@0.2.138`.

### Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000> in **Chrome or Edge** (Web Speech API isn't in Firefox/Safari).

When you load `/chat`, the dev terminal prints the auth path it picked:

```
[coach] auth: Gemini (gemini-2.5-flash)
[coach] auth: Anthropic API key (claude-opus-4-7)
[coach] auth: Claude Agent SDK (claude login)
```

## Cost

| Option | Monthly (30 min/day chat) |
|---|---|
| Gemini 2.5 Flash free tier | $0 |
| Anthropic API + `claude-opus-4-7` | ~$3–8 |
| Anthropic API + `claude-sonnet-4-6` (set in `src/lib/claude.ts`) | ~$1–3 |
| Claude Pro/Max subscription via Agent SDK | $0 extra |

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
