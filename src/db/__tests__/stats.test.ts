import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeSqliteDb } from './node-sqlite-db';
import { migrate } from '../migrations';
import { listStatus, questionStatuses, recordFlashcard } from '../stats';
import { weakAreaPriority } from '../queries';

async function fresh(): Promise<NodeSqliteDb> {
  const db = new NodeSqliteDb();
  await migrate(db);
  return db;
}

test('flashcards write the all-modes counters and NEVER the exam columns or last_result', async () => {
  const db = await fresh();
  await recordFlashcard(db, 'rs-001', 'road-signs', true, 1_000);
  await recordFlashcard(db, 'rs-001', 'road-signs', false, 2_000);
  await recordFlashcard(db, 'rs-001', 'road-signs', true, 3_000);
  const row = await db.getFirstAsync<Record<string, number | string | null>>('SELECT * FROM question_stats WHERE question_id = ?', ['rs-001']);
  assert.ok(row);
  assert.equal(row.seen_count, 3);
  assert.equal(row.correct_count, 2);
  assert.equal(row.wrong_count, 1);
  assert.equal(row.last_seen_at, 3_000);
  assert.equal(row.exam_seen, 0, 'exam_seen untouched');
  assert.equal(row.exam_correct, 0, 'exam_correct untouched');
  assert.equal(row.last_result, null, 'last_result untouched — flashcards cannot mark a question wrong-last-time');
  // …so the weak-area engine still sees it as never examined (weight 4).
  const w = await weakAreaPriority(db);
  assert.equal(w[0]?.weight, 4);
});

test('listStatus: unseen / mastered / wrong (incl. timeout) / seen', () => {
  assert.equal(listStatus(undefined), 'unseen');
  assert.equal(listStatus({ seenCount: 0, examSeen: 0, lastResult: null }), 'unseen');
  assert.equal(listStatus({ seenCount: 2, examSeen: 1, lastResult: 'correct' }), 'mastered');
  assert.equal(listStatus({ seenCount: 2, examSeen: 1, lastResult: 'wrong' }), 'wrong');
  assert.equal(listStatus({ seenCount: 2, examSeen: 1, lastResult: 'timeout' }), 'wrong');
  assert.equal(listStatus({ seenCount: 2, examSeen: 0, lastResult: null }), 'seen');
});

test('questionStatuses returns a map keyed by question id', async () => {
  const db = await fresh();
  await recordFlashcard(db, 'rs-002', 'road-signs', true, 1);
  const m = await questionStatuses(db);
  assert.deepEqual(m.get('rs-002'), { seenCount: 1, examSeen: 0, lastResult: null });
  assert.equal(m.get('rs-999'), undefined);
});
