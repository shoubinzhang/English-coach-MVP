// SM-2-ish spaced repetition. Grade 0-3 (Again / Hard / Good / Easy).

export type SrsState = { ease: number; interval_days: number; reps: number; lapses: number };

export function grade(state: SrsState, q: 0 | 1 | 2 | 3): SrsState {
  let { ease, interval_days, reps, lapses } = state;

  if (q === 0) {
    lapses += 1;
    reps = 0;
    interval_days = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) interval_days = 1;
    else if (reps === 2) interval_days = 3;
    else interval_days = Math.round(interval_days * ease * 10) / 10;

    const delta = q === 1 ? -0.15 : q === 2 ? 0 : 0.15;
    ease = Math.max(1.3, ease + delta);
  }
  return { ease, interval_days, reps, lapses };
}

export function nextDueAt(interval_days: number): string {
  const ms = Date.now() + interval_days * 86_400_000;
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}
