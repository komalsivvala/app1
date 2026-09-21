/**
 * The key queries from docs/05-Data-Schema.md §5, as typed functions.
 * Every one is executed against real SQLite in src/db/__tests__.
 */
import type { Db } from './types';

export type TopicId = 'road-signs' | 'rules-of-road-regulations' | 'general-driving-principles';

export interface TopicAccuracy {
  readonly topic: TopicId;
  readonly answered: number;
  readonly correct: number;
  readonly pct: number;
}

/** Per-topic accuracy — COMPLETED MOCK attempts only. The join matters:
 *  without it, abandoned attempts and untimed practice feed the accuracy bars. */
export function perTopicAccuracy(db: Db): Promise<TopicAccuracy[]> {
  return db.getAllAsync<TopicAccuracy>(
    `
    SELECT aa.topic,
           COUNT(*)                                                 AS answered,
           SUM(aa.outcome = 'correct')                              AS correct,
           ROUND(100.0 * SUM(aa.outcome = 'correct') / COUNT(*), 1) AS pct
    FROM attempt_answers aa
    JOIN attempts a ON a.id = aa.attempt_id
    WHERE a.status = 'completed' AND a.mode = 'mock' AND aa.outcome IS NOT NULL
    GROUP BY aa.topic
  `,
    [],
  );
}

export interface WeakAreaRow {
  readonly question_id: string;
  readonly topic: TopicId;
  readonly weight: 1 | 2 | 3 | 4;
}

/** Weak-area priority. Reads the EXAM columns, so flashcard self-assessment
 *  can never fool the engine. A 'timeout' last_result deliberately does not
 *  score 3 — it falls through to the accuracy test. Questions absent from the
 *  table entirely are also weight 4; the engine unions the bundle's ID list. */
export function weakAreaPriority(db: Db): Promise<WeakAreaRow[]> {
  return db.getAllAsync<WeakAreaRow>(
    `
    SELECT question_id, topic,
           CASE WHEN exam_seen = 0                                           THEN 4
                WHEN last_result = 'wrong'                                   THEN 3
                WHEN CAST(exam_correct AS REAL) / NULLIF(exam_seen, 0) < 0.6 THEN 2
                ELSE 1 END AS weight
    FROM question_stats
    ORDER BY weight DESC, last_seen_at ASC
  `,
    [],
  );
}

export interface InProgressAttempt {
  readonly id: number;
  readonly started_at: number;
  readonly question_count: number;
  readonly config_snapshot: string;
}

export interface PaperRow {
  readonly position: number;
  readonly question_id: string;
  readonly topic: TopicId;
  readonly correct_index: 0 | 1 | 2 | 3;
  readonly presented_at: number | null;
  readonly selected_index: 0 | 1 | 2 | 3 | null;
  readonly outcome: 'correct' | 'wrong' | 'timeout' | 'skipped' | null;
}

/** Resume: reads the paper, never re-samples. */
export function latestInProgressAttempt(db: Db): Promise<InProgressAttempt | null> {
  return db.getFirstAsync<InProgressAttempt>(
    `
    SELECT id, started_at, question_count, config_snapshot
    FROM attempts WHERE status = 'in_progress'
    ORDER BY started_at DESC LIMIT 1
  `,
    [],
  );
}

export function paperForAttempt(db: Db, attemptId: number): Promise<PaperRow[]> {
  return db.getAllAsync<PaperRow>(
    `SELECT position, question_id, topic, correct_index, presented_at, selected_index, outcome
     FROM attempt_answers WHERE attempt_id = ? ORDER BY position`,
    [attemptId],
  );
}

export interface RecentMock {
  readonly id: number;
  readonly correct_count: number;
  readonly question_count: number;
  readonly passed: 0 | 1 | null;
  readonly pct: number;
}

/** Readiness input — last 5 completed mocks. */
export function lastFiveCompletedMocks(db: Db): Promise<RecentMock[]> {
  return db.getAllAsync<RecentMock>(
    `
    SELECT id, correct_count, question_count, passed,
           ROUND(100.0 * correct_count / question_count, 1) AS pct
    FROM attempts
    WHERE mode = 'mock' AND status = 'completed'
    ORDER BY started_at DESC
    LIMIT 5
  `,
    [],
  );
}

/** ONE predicate, used identically in the PRD, the UI and the code:
 *  ready = count(last 5 completed mocks) >= 5 AND mean(pct of those 5) >= 80 */
export const READINESS_WINDOW = 5;
export const READINESS_MEAN_PCT = 80;

export function isReady(recent: readonly RecentMock[]): boolean {
  if (recent.length < READINESS_WINDOW) return false;
  const mean = recent.reduce((s, r) => s + r.pct, 0) / recent.length;
  return mean >= READINESS_MEAN_PCT;
}

export async function getMeta(db: Db, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setMeta(db: Db, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

/** Bookmarks pointing at a removed question are filtered at read time by the
 *  caller (it has the bundle); the DB does not know what content shipped. */
export function bookmarkedIds(db: Db): Promise<{ question_id: string; created_at: number }[]> {
  return db.getAllAsync('SELECT question_id, created_at FROM bookmarks ORDER BY created_at DESC', []);
}

export async function toggleBookmark(db: Db, questionId: string, now: number): Promise<boolean> {
  const { changes } = await db.runAsync('DELETE FROM bookmarks WHERE question_id = ?', [questionId]);
  if (changes > 0) return false;
  await db.runAsync('INSERT INTO bookmarks (question_id, created_at) VALUES (?, ?)', [questionId, now]);
  return true;
}
