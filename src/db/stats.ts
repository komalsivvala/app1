/**
 * question_stats reads for the Learn screens, and the ONE write path that is
 * not an attempt: flashcard self-assessment. Flashcards touch the all-modes
 * counters only — never exam_seen / exam_correct and never last_result — so
 * "I knew that" shows in progress displays but cannot fool the weak-area
 * engine (docs/04-App-Flow.md §4).
 */
import type { Db } from './types';

export type LastResult = 'correct' | 'wrong' | 'timeout';

export interface QuestionStatus {
  readonly seenCount: number;
  readonly examSeen: number;
  readonly lastResult: LastResult | null;
}

/** ✓ mastered · ! wrong last time · ○ unseen · · seen (flashcards only, no exam result yet) */
export type ListStatus = 'mastered' | 'wrong' | 'unseen' | 'seen';

export function listStatus(s: QuestionStatus | undefined): ListStatus {
  if (s === undefined || s.seenCount === 0) return 'unseen';
  if (s.lastResult === 'correct') return 'mastered';
  if (s.lastResult === 'wrong' || s.lastResult === 'timeout') return 'wrong';
  return 'seen';
}

export async function questionStatuses(db: Db): Promise<Map<string, QuestionStatus>> {
  const rows = await db.getAllAsync<{ question_id: string; seen_count: number; exam_seen: number; last_result: LastResult | null }>(
    'SELECT question_id, seen_count, exam_seen, last_result FROM question_stats',
    [],
  );
  return new Map(rows.map((r) => [r.question_id, { seenCount: r.seen_count, examSeen: r.exam_seen, lastResult: r.last_result }]));
}

export async function recordFlashcard(db: Db, questionId: string, topic: string, knewIt: boolean, now: number): Promise<void> {
  await db.runAsync(
    `INSERT INTO question_stats (question_id, topic, seen_count, correct_count, wrong_count, last_seen_at)
     VALUES (?, ?, 1, ?, ?, ?)
     ON CONFLICT(question_id) DO UPDATE SET
       seen_count    = seen_count + 1,
       correct_count = correct_count + excluded.correct_count,
       wrong_count   = wrong_count + excluded.wrong_count,
       last_seen_at  = excluded.last_seen_at`,
    [questionId, topic, knewIt ? 1 : 0, knewIt ? 0 : 1, now],
  );
}
