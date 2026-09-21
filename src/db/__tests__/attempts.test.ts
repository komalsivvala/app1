import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeSqliteDb } from './node-sqlite-db';
import { migrate } from '../migrations';
import { abandonAttempt, allQuestionStats, applyEffects, completedMockHistory, createAttempt, loadAttempt, type NewAttempt } from '../attempts';
import { latestInProgressAttempt, perTopicAccuracy, weakAreaPriority } from '../queries';
import { createSession, reduce, type Action, type Effect, type SessionState } from '@/engine/session';
import type { ExamConfig } from '@/engine/exam-config';

const config: ExamConfig = {
  questionCount: 3,
  passMark: 2,
  timing: { mode: 'per-question', secondsPerQuestion: 30, totalSeconds: null },
  allowBackNavigation: false,
  allowSkip: false,
  negativeMark: 0,
  sectionMix: { 'road-signs': 2, 'rules-of-road-regulations': 1, 'general-driving-principles': 0 },
  formatVerifiedOn: null,
};

const newAttempt = (mode: NewAttempt['mode'] = 'mock'): NewAttempt => ({
  mode,
  language: 'en',
  paper: [
    { questionId: 'rs-001', topic: 'road-signs', correctIndex: 0 },
    { questionId: 'rs-002', topic: 'road-signs', correctIndex: 1 },
    { questionId: 'rrr-001', topic: 'rules-of-road-regulations', correctIndex: 2 },
  ],
  config,
  contentVersion: '2026.09.1',
  seed: 'seed',
  startedAt: 1_000,
});

async function fresh(): Promise<NodeSqliteDb> {
  const db = new NodeSqliteDb();
  await migrate(db);
  return db;
}

/** Drive the pure reducer and persist every effect — exactly what the screen does. */
async function play(db: NodeSqliteDb, attemptId: number, state: SessionState, actions: Action[]): Promise<SessionState> {
  for (const a of actions) {
    const step = reduce(state, a);
    state = step.state;
    await applyEffects(db, attemptId, step.effects, config);
  }
  return state;
}

test('createAttempt writes the attempts row AND all N answer rows atomically — the paper is a DB fact', async () => {
  const db = await fresh();
  const id = await createAttempt(db, newAttempt());
  const loaded = await loadAttempt(db, id);
  assert.ok(loaded);
  assert.equal(loaded.attempt.status, 'in_progress');
  assert.equal(loaded.attempt.question_count, 3);
  assert.equal(loaded.attempt.pass_mark, 2);
  assert.deepEqual(loaded.paper.map((p) => [p.position, p.questionId, p.correctIndex, p.outcome]), [[0, 'rs-001', 0, null], [1, 'rs-002', 1, null], [2, 'rrr-001', 2, null]]);
  assert.deepEqual(loaded.config, config, 'config_snapshot round-trips');
  assert.equal((await latestInProgressAttempt(db))?.id, id);
});

test('a full mock through the reducer: presented_at, outcomes, finalisation, question_stats exam columns', async () => {
  const db = await fresh();
  const id = await createAttempt(db, newAttempt());
  const loaded = await loadAttempt(db, id);
  assert.ok(loaded);
  const s = await play(db, id, createSession(loaded.paper, config, 1_000), [
    { type: 'present', at: 1_000 },
    { type: 'select', index: 0 }, { type: 'next', at: 4_000 },   // correct
    { type: 'select', index: 3 }, { type: 'next', at: 9_000 },   // wrong
    { type: 'expire', at: 39_000 },                              // timeout
  ]);
  assert.equal(s.phase, 'complete');

  const after = await loadAttempt(db, id);
  assert.ok(after);
  assert.equal(after.attempt.status, 'completed');
  assert.equal(after.attempt.correct_count, 1);
  assert.equal(after.attempt.passed, 0);
  assert.equal(after.attempt.finished_at, 39_000);
  assert.equal(after.attempt.duration_ms, 38_000);
  assert.deepEqual(after.paper.map((p) => [p.presentedAt, p.selectedIndex, p.outcome, p.timeTakenMs]), [
    [1_000, 0, 'correct', 3_000],
    [4_000, 3, 'wrong', 5_000],
    [9_000, null, 'timeout', 30_000],
  ]);

  const stats = Object.fromEntries((await allQuestionStats(db)).map((r) => [r.question_id, r]));
  assert.deepEqual(stats['rs-001'], { question_id: 'rs-001', exam_seen: 1, exam_correct: 1, last_result: 'correct' });
  assert.deepEqual(stats['rs-002'], { question_id: 'rs-002', exam_seen: 1, exam_correct: 0, last_result: 'wrong' });
  assert.deepEqual(stats['rrr-001'], { question_id: 'rrr-001', exam_seen: 1, exam_correct: 0, last_result: 'timeout' });

  // The §5 queries now see it.
  const acc = Object.fromEntries((await perTopicAccuracy(db)).map((r) => [r.topic, r]));
  assert.deepEqual(acc['road-signs'], { topic: 'road-signs', answered: 2, correct: 1, pct: 50 });
  const weights = Object.fromEntries((await weakAreaPriority(db)).map((r) => [r.question_id, r.weight]));
  assert.deepEqual(weights, { 'rs-001': 1, 'rs-002': 3, 'rrr-001': 2 });
  assert.equal((await latestInProgressAttempt(db)), null);
  assert.deepEqual((await completedMockHistory(db)).map((h) => [h.id, h.correct_count, h.passed]), [[id, 1, 0]]);
});

test('a practice attempt updates the all-modes counters but NEVER the exam columns', async () => {
  const db = await fresh();
  const id = await createAttempt(db, newAttempt('practice'));
  const loaded = await loadAttempt(db, id);
  assert.ok(loaded);
  assert.equal(loaded.attempt.pass_mark, null);
  await play(db, id, createSession(loaded.paper, config, 1_000), [
    { type: 'present', at: 1_000 },
    { type: 'select', index: 0 }, { type: 'next', at: 2_000 },
    { type: 'select', index: 1 }, { type: 'next', at: 3_000 },
    { type: 'select', index: 2 }, { type: 'next', at: 4_000 },
  ]);
  const after = await loadAttempt(db, id);
  assert.equal(after?.attempt.passed, null, 'practice never sets passed');
  for (const r of await allQuestionStats(db)) {
    assert.equal(r.exam_seen, 0, `${r.question_id} exam_seen must stay 0 after practice`);
    assert.equal(r.exam_correct, 0);
  }
  const seen = await db.getAllAsync<{ question_id: string; seen_count: number; correct_count: number }>('SELECT question_id, seen_count, correct_count FROM question_stats ORDER BY question_id', []);
  assert.deepEqual(seen, [
    { question_id: 'rrr-001', seen_count: 1, correct_count: 1 },
    { question_id: 'rs-001', seen_count: 1, correct_count: 1 },
    { question_id: 'rs-002', seen_count: 1, correct_count: 1 },
  ]);
  assert.deepEqual(await perTopicAccuracy(db), [], 'practice never feeds the accuracy bars');
});

test('resume: kill mid-paper, reload, continue — presented_at is reused, not re-sampled', async () => {
  const db = await fresh();
  const id = await createAttempt(db, newAttempt());
  const first = await loadAttempt(db, id);
  assert.ok(first);
  await play(db, id, createSession(first.paper, config, 1_000), [
    { type: 'present', at: 1_000 },
    { type: 'select', index: 0 }, { type: 'next', at: 5_000 },
    { type: 'select', index: 1 },   // tapped, not submitted, then the process died
  ]);
  // Relaunch.
  const again = await loadAttempt(db, id);
  assert.ok(again);
  const resumed = createSession(again.paper, config, again.attempt.started_at);
  assert.equal(resumed.position, 1);
  assert.equal(resumed.paper[1]?.presentedAt, 5_000, 'the clock anchor survived the kill');
  assert.equal(resumed.pendingSelection, null, 'an unsubmitted tap does not survive a kill');
  // 40 s after q1 was presented: q1 timed out, q2 is live from 35_000.
  const s = await play(db, id, resumed, [{ type: 'resume', at: 45_000 }]);
  assert.equal(s.position, 2);
  const rows = (await loadAttempt(db, id))?.paper;
  assert.deepEqual(rows?.map((p) => [p.outcome, p.presentedAt]), [['correct', 1_000], ['timeout', 5_000], [null, 35_000]]);
});

test('abandon marks the attempt and it no longer counts as in progress', async () => {
  const db = await fresh();
  const id = await createAttempt(db, newAttempt());
  await abandonAttempt(db, id);
  assert.equal((await loadAttempt(db, id))?.attempt.status, 'abandoned');
  assert.equal(await latestInProgressAttempt(db), null);
  assert.deepEqual(await perTopicAccuracy(db), []);
});

test('the unreliable-clock effect flags the attempt; finalising twice is a no-op', async () => {
  const db = await fresh();
  const id = await createAttempt(db, newAttempt());
  const effects: Effect[] = [{ kind: 'unreliable' }, { kind: 'finish', at: 9_000 }, { kind: 'finish', at: 99_000 }];
  await applyEffects(db, id, effects, config);
  const after = await loadAttempt(db, id);
  assert.equal(after?.attempt.timing_reliable, 0);
  assert.equal(after?.attempt.finished_at, 9_000, 'second finish did not overwrite');
});

test('createAttempt rolls back entirely if an answer row fails (transaction)', async () => {
  const db = await fresh();
  const bad = newAttempt();
  const broken: NewAttempt = { ...bad, paper: [...bad.paper, { questionId: 'x', topic: 'road-signs', correctIndex: 7 as 0 }] };
  await assert.rejects(() => createAttempt(db, broken), /CHECK/);
  const n = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM attempts', []);
  assert.equal(n?.n, 0, 'no half-written attempt');
});
