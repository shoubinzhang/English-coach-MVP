export function splitSentences(text: string): string[] {
  // Simple sentence splitter: end on . ! ? followed by space/EOL.
  // Keeps the terminator. Filters empties.
  const raw = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/g);
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}

// Normalize for matching: lowercase, strip punctuation, collapse whitespace.
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Word-level similarity using Levenshtein on token sequence.
// Returns 0..1.
export function similarity(a: string, b: string): number {
  const aw = normalize(a).split(" ").filter(Boolean);
  const bw = normalize(b).split(" ").filter(Boolean);
  if (aw.length === 0 && bw.length === 0) return 1;
  if (aw.length === 0 || bw.length === 0) return 0;
  const d = levenshtein(aw, bw);
  return 1 - d / Math.max(aw.length, bw.length);
}

function levenshtein<T>(a: T[], b: T[]): number {
  const m = a.length;
  const n = b.length;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}
