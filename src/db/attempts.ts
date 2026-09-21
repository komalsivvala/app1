/**
 * Attempt persistence — the paper is a database fact (docs/05-Data-Schema.md §4).
 * All N attempt_answers rows are written at creation, so resume reads them and
 * never re-samples. Effects from the session reducer are applied here.
 */
import type { ExamConfig } from '@/engine/exam-config';
import type { Outcome } from '@/engine/scoring';
import type { Effect, OptionIndex, PaperItem } from '@/engine/session';

import type { Db } from './types';

export type AttemptMode = 'mock' | 'practice';
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned';

export interface NewAttempt {
  readonly mode: AttemptMode;
  readonly language: 'en' | 'te';
  readonly paper: readonly { questionId: string; topic: string; correctIndex: OptionIndex }[];
  readonly config: ExamConfig;
  readonly contentVersion: string;
  readonly seed: string;
  readonly startedAt: number;
}

export interface AttemptRow {
  readonly id: number;
  readonly mode: AttemptMode;
  readonly language: 'en' | 'te';
  readonly status: AttemptStatus;
  readonly started_at: number;
  readonly finished_at: number | null;
  readonly question_count: number;
  readonly correct_count: number;
  readonly pass_mark: number | null;
  readonly passed: 0 | 1 | null;
  readonly duration_ms: number | null;
  readonly timing_reliable: 0 | 1;
  readonly seed: string;
  readonly config_snapshot: string;
  readonly content_version: string;
}

interface AnswerRow {
  readonly position: number;
  readonly question_id: string;
  readonly topic: string;
  readonly correct_index: OptionIndex;
  readonly presented_at: number | null;
  readonly selected_index: OptionIndex | null;
  readonly outcome: Outcome | null;
  readonly time_taken_ms: number | null;
}

export interface LoadedAttempt {
  readonly attempt: AttemptRow;
  readonly config: ExamConfig;
  readonly paper: PaperItem[];
}

export async function createAttempt(db: Db, a: NewAttempt): Promise<number> {
  let id = 0;
  await db.withTransactionAsync(async () => {
    const { lastInsertRowId } = await db.runAsync(
      `INSERT INTO attempts (mode, language, status, started_at, question_count, pass_mark, seed, config_snapshot, content_version)
       VALUES (?, ?, 'in_progress', ?, ?, ?, ?, ?, ?)`,
      [a.mode, a.language, a.startedAt, a.paper.length, a.mode === 'mock' ? a.config.passMark : null, a.seed, JSON.stringify(a.config), a.contentVersion],
    );
    id = lastInsertRowId;
    for (const [position, q] of a.paper.entries()) {
      await db.runAsync(
        `INSERT INTO attempt_answers (attempt_id, position, question_id, topic, correct_index) VALUES (?, ?, ?, ?, ?)`,
        [id, position, q.questionId, q.topic, q.correctIndex],
      );
    }
  });
  return id;
}

export async function loadAttempt(db: Db, attemptId: number): Promise<LoadedAttempt | null> {
  const attempt = await db.getFirstAsync<AttemptRow>('SELECT * FROM attempts WHERE id = ?', [attemptId]);
  if (attempt === null) return null;
  const rows = await db.getAllAsync<AnswerRow>(
    `SELECT position, question_id, topic, correct_index, presented_at, selected_index, outcome, time_taken_ms
     FROM attempt_answers WHERE attempt_id = ? ORDER BY position`,
    [attemptId],
  );
  return {
    attempt,
    config: JSON.parse(attempt.config_snapshot) as ExamConfig,
    paper: rows.map((r) => ({
      position: r.position,
      questionId: r.question_id,
      topic: r.topic,
      correctIndex: r.correct_index,
      presentedAt: r.presented_at,
      selectedIndex: r.selected_index,
      outcome: r.outcome,
      timeTakenMs: r.time_taken_ms,
    })),
  };
}

export async function abandonAttempt(db: Db, attemptId: number): Promise<void> {
  await db.runAsync(`UPDATE attempts SET status = 'abandoned', finished_at = ? WHERE id = ? AND status = 'in_progress'`, [Date.now(), attemptId]);
}

/** Apply one reducer effect. `finish` scores the attempt and updates
 *  question_stats — exam columns for mock attempts only. */
export async function applyEffect(db: Db, attemptId: number, effect: Effect, config: ExamConfig): Promise<void> {
  switch (effect.kind) {
    case 'present':
      await db.runAsync(`UPDATE attempt_answers SET presented_at = ? WHERE attempt_id = ? AND position = ? AND presented_at IS NULL`, [effect.at, attemptId, effect.position]);
      return;
    case 'record':
      await db.runAsync(
        `UPDATE attempt_answers
         SET selected_index = ?, outcome = ?, time_taken_ms = ?, presented_at = COALESCE(?, presented_at)
         WHERE attempt_id = ? AND position = ?`,
        [effect.selectedIndex, effect.outcome, effect.timeTakenMs, effect.presentedAt ?? null, attemptId, effect.position],
      );
      return;
    case 'unreliable':
      await db.runAsync(`UPDATE attempts SET timing_reliable = 0 WHERE id = ?`, [attemptId]);
      return;
    case 'abandon':
      await abandonAttempt(db, attemptId);
      return;
    case 'finish':
      await finalizeAttempt(db, attemptId, effect.at, config);
      return;
  }
}

export async function applyEffects(db: Db, attemptId: number, effects: readonly Effect[], config: ExamConfig): Promise<void> {
  for (const e of effects) await applyEffect(db, attemptId, e, config);
}

async function finalizeAttempt(db: Db, attemptId: number, at: number, config: ExamConfig): Promise<void> {
  await db.withTransactionAsync(async () => {
    const attempt = await db.getFirstAsync<Pick<AttemptRow, 'mode' | 'started_at' | 'status'>>('SELECT mode, started_at, status FROM attempts WHERE id = ?', [attemptId]);
    if (attempt === null || attempt.status !== 'in_progress') return;
    const rows = await db.getAllAsync<Pick<AnswerRow, 'question_id' | 'topic' | 'outcome'>>(
      'SELECT question_id, topic, outcome FROM attempt_answers WHERE attempt_id = ?',
      [attemptId],
    );
    const correct = rows.filter((r) => r.outcome === 'correct').length;
    const wrong = rows.filter((r) => r.outcome === 'wrong').length;
    const score = Math.max(0, correct - wrong * config.negativeMark);
    const isMock = attempt.mode === 'mock';
    const passed = isMock ? (score >= config.passMark ? 1 : 0) : null;

    await db.runAsync(
      `UPDATE attempts SET status = 'completed', finished_at = ?, duration_ms = ?, correct_count = ?, passed = ? WHERE id = ?`,
      [at, at - attempt.started_at, correct, passed, attemptId],
    );

    for (const r of rows) {
      if (r.outcome === null) continue;
      const isCorrect = r.outcome === 'correct' ? 1 : 0;
      const isWrong = r.outcome === 'wrong' ? 1 : 0;
      const isTimeout = r.outcome === 'timeout' ? 1 : 0;
      // 'skipped' bumps seen_count only and leaves last_result untouched.
      const lastResult = r.outcome === 'skipped' ? null : r.outcome;
      await db.runAsync(
        `INSERT INTO question_stats (question_id, topic, seen_count, correct_count, wrong_count, timeout_count, exam_seen, exam_correct, last_seen_at, last_result)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(question_id) DO UPDATE SET
           seen_count    = seen_count + 1,
           correct_count = correct_count + excluded.correct_count,
           wrong_count   = wrong_count + excluded.wrong_count,
           timeout_count = timeout_count + excluded.timeout_count,
           exam_seen     = exam_seen + excluded.exam_seen,
           exam_correct  = exam_correct + excluded.exam_correct,
           last_seen_at  = excluded.last_seen_at,
           last_result   = COALESCE(excluded.last_result, last_result)`,
        [r.question_id, r.topic, isCorrect, isWrong, isTimeout, isMock ? 1 : 0, isMock ? isCorrect : 0, at, lastResult],
      );
    }
  });
}

export interface StatsRow {
  readonly question_id: string;
  readonly exam_seen: number;
  readonly exam_correct: number;
  readonly last_result: 'correct' | 'wrong' | 'timeout' | null;
}

export function allQuestionStats(db: Db): Promise<StatsRow[]> {
  return db.getAllAsync<StatsRow>('SELECT question_id, exam_seen, exam_correct, last_result FROM question_stats', []);
}

export interface HistoryRow {
  readonly id: number;
  readonly started_at: number;
  readonly correct_count: number;
  readonly question_count: number;
  readonly passed: 0 | 1 | null;
  readonly timing_reliable: 0 | 1;
}

export function completedMockHistory(db: Db, limit = 50): Promise<HistoryRow[]> {
  return db.getAllAsync<HistoryRow>(
    `SELECT id, started_at, correct_count, question_count, passed, timing_reliable
     FROM attempts WHERE mode = 'mock' AND status = 'completed' ORDER BY started_at DESC LIMIT ?`,
    [limit],
  );
}
