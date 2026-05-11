# English Coach MVP

Four modes, one app:

1. **Conversation** — Speak; Claude replies and logs your errors.
2. **Review** — SRS flashcards from those errors.
3. **Shadowing** — Paste a script, repeat sentence-by-sentence, get scored.
4. **Pronunciation** — Azure Speech phoneme-level scoring.

## Stack

- Next.js 14 (App Router) + TypeScript
- SQLite via `better-sqlite3` (file at `./data/coach.db`)
- Anthropic SDK — `claude-opus-4-7` with structured outputs + prompt caching
- Web Speech API for browser STT/TTS (free, decent enough)
- Azure Speech SDK for pronunciation assessment (M4 only)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY at minimum.
# Optional: AZURE_SPEECH_KEY + AZURE_SPEECH_REGION for /pronunciation.
npm run dev
```

Open <http://localhost:3000>. **Use Chrome or Edge** — Web Speech API isn't supported in Firefox/Safari yet.

## Cost

`claude-opus-4-7` is the most capable model and the default. With a 30-min/day conversation habit you'll spend a few dollars a month. If that's too much, swap to `claude-sonnet-4-6` in `src/lib/claude.ts` — for English coaching, Sonnet handles it just fine.

The system prompt is cached (`cache_control: ephemeral`), so each conversational turn after the first only pays for the new user text + response.

## Future: YouTube import for Shadowing

The current shadowing flow accepts pasted scripts. To support `yt-dlp` import:

1. `npm i yt-dlp-wrap` (or shell-out to a `yt-dlp` binary).
2. In `src/app/api/shadowing/import/route.ts`, if `url` is provided, download subtitles + audio.
3. Use the subtitle timestamps to populate `start_ms` / `end_ms` on `shadowing_sentences`.
4. Serve audio chunks via a new `/api/shadowing/<id>/audio/<idx>` route and play them in the session UI.

## Pricing the upgrade path

| Mode | Free tier (default) | Paid upgrade |
|------|---------------------|--------------|
| STT  | Web Speech API      | Whisper API (`~$0.006/min`) |
| TTS  | browser SpeechSynthesis | OpenAI TTS (`~$15/1M chars`) |
| Pronunciation | none (browser can't do phonemes) | Azure Speech (free tier `~5h/month`) |
