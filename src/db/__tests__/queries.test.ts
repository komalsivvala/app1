import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeSqliteDb } from './node-sqlite-db';
import { migrate } from '../migrations';
import {
  perTopicAccuracy, weakAreaPriority, latestInProgressAttempt, paperForAttempt,
  lastFiveCompletedMocks, isReady, getMeta, setMeta, toggleBookmark, bookmarkedIds,
} from '../queries';
import type { RecentMock } from '../queries';

type Outcome = 'correct' | 'wrong' | 'timeout' | 'skipped' | null;

async function fresh(): Promise<NodeSqliteDb> {
  const db = new NodeSqliteDb();
  await migrate(db);
  return db;
}

async function attempt(
  db: NodeSqliteDb,
  o: { mode?: 'mock' | 'practice'; status?: 'in_progress' | 'completed' | 'abandoned'; startedAt: number; correct?: number; count?: number; passed?: 0 | 1 | null },
): Promise<number> {
  const { lastInsertRowId } = await db.runAsync(
    `INSERT INTO attempts (mode, language, status, started_at, question_count, correct_count, pass_mark, passed, seed, config_snapshot, content_version)
     VALUES (?, 'en', ?, ?, ?, ?, 12, ?, 'seed', '{"questionCount":20}', '2026.09.1')`,
    [o.mode ?? 'mock', o.status ?? 'completed', o.startedAt, o.count ?? 20, o.correct ?? 0, o.passed ?? null],
  );
  return lastInsertRowId;
}

async function answer(db: NodeSqliteDb, attemptId: number, position: number, topic: string, outcome: Outcome, qid = `q-${attemptId}-${position}`) {
  await db.runAsync(
    `INSERT INTO attempt_answers (attempt_id, position, question_id, topic, correct_index, outcome) VALUES (?, ?, ?, ?, 0, ?)`,
    [attemptId, position, qid, topic, outcome],
  );
}

test('perTopicAccuracy counts ONLY completed mock attempts', async () => {
  const db = await fresh();
  const mock = await attempt(db, { startedAt: 1 });
  await answer(db, mock, 0, 'road-signs', 'correct');
  await answer(db, mock, 1, 'road-signs', 'wrong');
  await answer(db, mock, 2, 'road-signs', 'timeout');
  await answer(db, mock, 3, 'rules-of-road-regulations', 'correct');
  await answer(db, mock, 4, 'rules-of-road-regulations', null); // not reached — excluded

  const abandoned = await attempt(db, { status: 'abandoned', startedAt: 2 });
  await answer(db, abandoned, 0, 'road-signs', 'correct'); // must NOT count
  const practice = await attempt(db, { mode: 'practice', startedAt: 3 });
  await answer(db, practice, 0, 'road-signs', 'correct'); // must NOT count

  const rows = await perTopicAccuracy(db);
  const byTopic = Object.fromEntries(rows.map((r) => [r.topic, r]));
  assert.deepEqual(byTopic['road-signs'], { topic: 'road-signs', answered: 3, correct: 1, pct: 33.3 });
  assert.deepEqual(byTopic['rules-of-road-regulations'], { topic: 'rules-of-road-regulations', answered: 1, correct: 1, pct: 100 });
  assert.equal(rows.length, 2);
});

test('weakAreaPriority: never-seen 4, wrong-last 3, accuracy<60% 2, else 1; timeout does NOT score 3', async () => {
  const db = await fresh();
  const ins = (id: string, seen: number, correct: number, last: string | null, lastSeen: number) =>
    db.runAsync(
      `INSERT INTO question_stats (question_id, topic, exam_seen, exam_correct, last_result, last_seen_at) VALUES (?, 'road-signs', ?, ?, ?, ?)`,
      [id, seen, correct, last, lastSeen],
    );
  await ins('never', 0, 0, null, 0);
  await ins('wrong-last', 4, 3, 'wrong', 10);
  await ins('weak-acc', 5, 2, 'correct', 20); // 40% < 60%
  await ins('strong', 5, 5, 'correct', 30);
  await ins('timeout-but-strong', 5, 4, 'timeout', 5); // 80%: timeout is not "wrong"

  const rows = await weakAreaPriority(db);
  const weight = Object.fromEntries(rows.map((r) => [r.question_id, r.weight]));
  assert.deepEqual(weight, { never: 4, 'wrong-last': 3, 'weak-acc': 2, strong: 1, 'timeout-but-strong': 1 });
  assert.equal(rows[0]?.question_id, 'never', 'ordered by weight DESC');
});

test('resume: latest in-progress attempt and its paper in position order', async () => {
  const db = await fresh();
  assert.equal(await latestInProgressAttempt(db), null);
  const older = await attempt(db, { status: 'in_progress', startedAt: 100 });
  const newer = await attempt(db, { status: 'in_progress', startedAt: 200 });
  await answer(db, newer, 1, 'road-signs', null, 'rs-002');
  await answer(db, newer, 0, 'road-signs', 'correct', 'rs-001');

  const resumed = await latestInProgressAttempt(db);
  assert.equal(resumed?.id, newer);
  assert.notEqual(resumed?.id, older);
  assert.equal(resumed?.config_snapshot, '{"questionCount":20}');

  const paper = await paperForAttempt(db, newer);
  assert.deepEqual(paper.map((p) => [p.position, p.question_id, p.outcome]), [[0, 'rs-001', 'correct'], [1, 'rs-002', null]]);
});

test('lastFiveCompletedMocks: newest first, max 5, mocks only', async () => {
  const db = await fresh();
  for (let i = 1; i <= 7; i++) await attempt(db, { startedAt: i * 10, correct: 10 + i, passed: 1 });
  await attempt(db, { mode: 'practice', startedAt: 999, correct: 20 });
  await attempt(db, { status: 'abandoned', startedAt: 998, correct: 20 });
  const rows = await lastFiveCompletedMocks(db);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((r) => r.correct_count), [17, 16, 15, 14, 13]);
  assert.equal(rows[0]?.pct, 85);
});

test('isReady: exactly the PRD predicate — 5 completed mocks AND mean >= 80', () => {
  const mk = (pcts: number[]): RecentMock[] => pcts.map((pct, i) => ({ id: i, correct_count: 0, question_count: 20, passed: 1, pct }));
  assert.equal(isReady(mk([100, 100, 100, 100])), false, 'four is not five');
  assert.equal(isReady(mk([80, 80, 80, 80, 80])), true, 'mean exactly 80 passes');
  assert.equal(isReady(mk([100, 100, 100, 100, 79])), true, 'one weak paper, high mean');
  assert.equal(isReady(mk([79, 80, 80, 80, 80])), false, 'mean 79.8 fails');
});

test('meta upsert', async () => {
  const db = await fresh();
  assert.equal(await getMeta(db, 'k'), null);
  await setMeta(db, 'k', '1');
  await setMeta(db, 'k', '2');
  assert.equal(await getMeta(db, 'k'), '2');
});

test('toggleBookmark flips and reports the new state', async () => {
  const db = await fresh();
  assert.equal(await toggleBookmark(db, 'rrr-014', 1000), true);
  assert.deepEqual(await bookmarkedIds(db), [{ question_id: 'rrr-014', created_at: 1000 }]);
  assert.equal(await toggleBookmark(db, 'rrr-014', 2000), false);
  assert.deepEqual(await bookmarkedIds(db), []);
});
