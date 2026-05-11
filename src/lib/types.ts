export type Correction = {
  original: string;
  corrected: string;
  category: "grammar" | "word_choice" | "naturalness" | "pronunciation" | "other";
  explanation: string;
};

export type CoachReply = {
  reply: string;
  corrections: Correction[];
  follow_up?: string;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ErrorRow = {
  id: number;
  original: string;
  corrected: string;
  category: string;
  explanation: string;
  ease: number;
  interval_days: number;
  due_at: string;
  reps: number;
  lapses: number;
  created_at: string;
};
