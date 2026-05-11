import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-4-7";

let _client: Anthropic | null = null;
export function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export const COACH_SYSTEM_PROMPT = `You are an English speaking coach for a non-native learner.
Your job each turn:
1. Read the learner's utterance (which came from speech-to-text, so it may have transcription noise — ignore obvious STT artifacts).
2. Identify language errors and natural-English upgrades. Be picky but fair. Skip true STT noise.
3. Reply in friendly, natural spoken English. Keep your reply to 1–3 sentences and end with a question that invites them to keep talking.
4. Return a JSON object via the output schema. Do not include any prose outside the JSON.

For each correction, prefer the smallest faithful rewrite. Categories:
- grammar (verb tense, agreement, articles, prepositions)
- word_choice (wrong word, register, collocation)
- naturalness (technically correct but unidiomatic)
- pronunciation (only if the learner explicitly asked about pronunciation; STT can't see phonemes)
- other

If the utterance is fluent and natural, return an empty corrections array — don't invent errors.

Tone: encouraging but honest. Never lecture. No "Great question!" filler.`;

export const COACH_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "Your spoken reply (1–3 sentences, ending with a question).",
    },
    corrections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          corrected: { type: "string" },
          category: {
            type: "string",
            enum: ["grammar", "word_choice", "naturalness", "pronunciation", "other"],
          },
          explanation: { type: "string" },
        },
        required: ["original", "corrected", "category", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["reply", "corrections"],
  additionalProperties: false,
} as const;
