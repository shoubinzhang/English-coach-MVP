import Anthropic from "@anthropic-ai/sdk";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import path from "node:path";
import fs from "node:fs";
import type { ChatTurn, CoachReply } from "./types";

export const MODEL = "claude-opus-4-7";

export const COACH_SYSTEM_PROMPT = `You are an English speaking coach for a non-native learner.
Your job each turn:
1. Read the learner's utterance (which came from speech-to-text, so it may have transcription noise — ignore obvious STT artifacts).
2. Identify language errors and natural-English upgrades. Be picky but fair. Skip true STT noise.
3. Reply in friendly, natural spoken English. Keep your reply to 1–3 sentences and end with a question that invites them to keep talking.
4. Return a JSON object only — no prose, no markdown fences, no explanation outside the JSON.

For each correction, prefer the smallest faithful rewrite. Categories:
- grammar (verb tense, agreement, articles, prepositions)
- word_choice (wrong word, register, collocation)
- naturalness (technically correct but unidiomatic)
- pronunciation (only if the learner explicitly asked about pronunciation; STT can't see phonemes)
- other

If the utterance is fluent and natural, return an empty corrections array — don't invent errors.

Tone: encouraging but honest. Never lecture. No "Great question!" filler.

You are NOT an autonomous agent for this task: do not use any tools. Just produce the JSON reply directly.`;

const COACH_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
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

export async function coach(history: ChatTurn[], userText: string): Promise<CoachReply> {
  // Path order: Gemini → Anthropic API key → Claude Agent SDK.
  // Gemini gets the simplest free path so most users land here.
  if (process.env.GEMINI_API_KEY) {
    return coachViaGemini(history, userText);
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // Length guard rejects "sk-ant-..." placeholders. Real keys are ~95 chars.
  if (apiKey && /^sk-ant-[a-zA-Z0-9_-]{40,}$/.test(apiKey)) {
    return coachViaAPI(history, userText);
  }
  return coachViaAgentSDK(history, userText);
}

let _api: Anthropic | null = null;
async function coachViaAPI(history: ChatTurn[], userText: string): Promise<CoachReply> {
  if (!_api) _api = new Anthropic();
  const resp = await _api.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: COACH_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    output_config: { format: { type: "json_schema", schema: COACH_SCHEMA } },
    messages: [
      ...history.map((t) => ({ role: t.role, content: t.content })),
      { role: "user" as const, content: userText },
    ],
  });
  const text = resp.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text response from API");
  return JSON.parse(text.text) as CoachReply;
}

// Compute the absolute path to the bundled `claude` binary that ships with
// @anthropic-ai/claude-agent-sdk as an optional dependency. Next.js / webpack
// breaks the SDK's own resolution (which uses import.meta.url) so we hand it
// an explicit path it can spawn.
function resolveBundledClaudeBinary(): string | undefined {
  const platform = process.platform; // "win32" | "darwin" | "linux"
  const arch = process.arch; // "x64" | "arm64"
  const binName = platform === "win32" ? "claude.exe" : "claude";

  const candidates =
    platform === "linux"
      ? [
          `@anthropic-ai/claude-agent-sdk-linux-${arch}`,
          `@anthropic-ai/claude-agent-sdk-linux-${arch}-musl`,
        ]
      : [`@anthropic-ai/claude-agent-sdk-${platform}-${arch}`];

  for (const pkg of candidates) {
    const p = path.join(process.cwd(), "node_modules", pkg, binName);
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const CLAUDE_BIN = resolveBundledClaudeBinary();

async function coachViaAgentSDK(history: ChatTurn[], userText: string): Promise<CoachReply> {
  const transcript =
    history.length === 0
      ? ""
      : "Conversation so far:\n" +
        history
          .map((t) => `${t.role === "user" ? "Learner" : "Coach"}: ${t.content}`)
          .join("\n") +
        "\n\n";

  const fullPrompt = `${transcript}Learner says: ${JSON.stringify(userText)}

Return ONLY a JSON object on a single line. No prose, no markdown, no \`\`\` fences. Shape:
{"reply":"<your 1-3 sentence spoken reply ending with a question>","corrections":[{"original":"...","corrected":"...","category":"grammar|word_choice|naturalness|pronunciation|other","explanation":"..."}]}`;

  let result = "";
  for await (const message of query({
    prompt: fullPrompt,
    options: {
      model: MODEL,
      pathToClaudeCodeExecutable: CLAUDE_BIN,
      systemPrompt: {
        type: "preset",
        preset: "claude_code",
        append: COACH_SYSTEM_PROMPT,
      },
      disallowedTools: [
        "Bash",
        "Read",
        "Write",
        "Edit",
        "Glob",
        "Grep",
        "WebFetch",
        "WebSearch",
        "Task",
        "TodoWrite",
        "NotebookEdit",
      ],
      maxTurns: 1,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
    },
  })) {
    if (message.type === "result" && message.subtype === "success") {
      result = message.result;
      break;
    }
  }
  if (!result) throw new Error("Agent SDK returned no result");
  return parseCoachJSON(result);
}

// ---- Gemini path -----------------------------------------------------------

const GEMINI_MODEL = "gemini-2.5-flash";

const GEMINI_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    reply: { type: SchemaType.STRING },
    corrections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          original: { type: SchemaType.STRING },
          corrected: { type: SchemaType.STRING },
          category: {
            type: SchemaType.STRING,
            enum: ["grammar", "word_choice", "naturalness", "pronunciation", "other"],
          },
          explanation: { type: SchemaType.STRING },
        },
        required: ["original", "corrected", "category", "explanation"],
      },
    },
  },
  required: ["reply", "corrections"],
};

let _gemini: GoogleGenerativeAI | null = null;
async function coachViaGemini(history: ChatTurn[], userText: string): Promise<CoachReply> {
  if (!_gemini) _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = _gemini.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: COACH_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      responseSchema: GEMINI_SCHEMA as any,
    },
  });
  // Gemini wants Content[] with parts. Use 'user'/'model' roles.
  const contents = [
    ...history.map((t) => ({
      role: t.role === "assistant" ? "model" : "user",
      parts: [{ text: t.content }],
    })),
    { role: "user", parts: [{ text: userText }] },
  ];
  const resp = await model.generateContent({ contents });
  const text = resp.response.text();
  return parseCoachJSON(text);
}

// ---- shared JSON parsing ---------------------------------------------------

function parseCoachJSON(text: string): CoachReply {
  let s = text.trim();
  // Strip ``` and ```json fences if present.
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // Find outermost {...}.
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s) as CoachReply;
}
