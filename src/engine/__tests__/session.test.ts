import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ExamConfig } from '../exam-config';
import { scoreAttempt } from '../scoring';
import { createSession, currentDeadline, reduce, timerTotalMs, type Action, type Effect, type PaperItem, type SessionState } from '../session';

const perQuestion: ExamConfig = {
  questionCount: 4,
  passMark: 3,
  timing: { mode: 'per-question', secondsPerQuestion: 30, totalSeconds: null },
  allowBackNavigation: false,
  allowSkip: false,
  negativeMark: 0,
  sectionMix: { 'road-signs': 2, 'rules-of-road-regulations': 1, 'general-driving-principles': 1 },
  formatVerifiedOn: null,
};
const wholePaper: ExamConfig = { ...perQuestion, timing: { mode: 'whole-paper', secondsPerQuestion: null, totalSeconds: 120 }, allowBackNavigation: true, allowSkip: true };

function paper(n = 4): PaperItem[] {
  return Array.from({ length: n }, (_, position) => ({
    position,
    questionId: `q${position}`,
    topic: 'road-signs',
    correctIndex: (position % 4) as PaperItem['correctIndex'],
    presentedAt: null,
    selectedIndex: null,
    outcome: null,
    timeTakenMs: null,
  }));
}

/** Run actions in order, collecting every effect. */
function run(initial: SessionState, actions: Action[]): { state: SessionState; effects: Effect[] } {
  let state = initial;
  const effects: Effect[] = [];
  for (const a of actions) {
    const step = reduce(state, a);
    state = step.state;
    effects.push(...step.effects);
  }
  return { state, effects };
}

test('happy path: present → select → next through the paper; outcomes and effects recorded; finishes', () => {
  const s0 = createSession(paper(), perQuestion, 1_000);
  const { state, effects } = run(s0, [
    { type: 'present', at: 1_000 },
    { type: 'select', index: 0 }, { type: 'next', at: 6_000 },   // correct (q0 correct=0)
    { type: 'select', index: 3 }, { type: 'next', at: 12_000 },  // wrong (q1 correct=1)
    { type: 'select', index: 2 }, { type: 'next', at: 15_000 },  // correct (q2)
    { type: 'select', index: 3 }, { type: 'next', at: 21_000 },  // correct (q3)
  ]);
  assert.equal(state.phase, 'complete');
  assert.equal(state.finishedAt, 21_000);
  assert.deepEqual(state.paper.map((p) => p.outcome), ['correct', 'wrong', 'correct', 'correct']);
  assert.deepEqual(state.paper.map((p) => p.presentedAt), [1_000, 6_000, 12_000, 15_000]);
  assert.deepEqual(state.paper.map((p) => p.timeTakenMs), [5_000, 6_000, 3_000, 6_000]);
  assert.deepEqual(effects.map((e) => e.kind), ['present', 'record', 'present', 'record', 'present', 'record', 'present', 'record', 'finish']);
  const summary = scoreAttempt(state.paper.map((p) => p.outcome), perQuestion);
  assert.equal(summary.correct, 3);
  assert.equal(summary.passed, true);
});

test('forward-only: Next without a selection is a no-op when allowSkip is false', () => {
  const s0 = createSession(paper(), perQuestion, 0);
  const { state, effects } = run(s0, [{ type: 'present', at: 0 }, { type: 'next', at: 5 }]);
  assert.equal(state.position, 0);
  assert.equal(effects.filter((e) => e.kind === 'record').length, 0);
});

test('forward-only: previous is a no-op when allowBackNavigation is false', () => {
  const s0 = createSession(paper(), perQuestion, 0);
  const { state } = run(s0, [{ type: 'present', at: 0 }, { type: 'select', index: 0 }, { type: 'next', at: 1 }, { type: 'previous' }]);
  assert.equal(state.position, 1);
});

test('expire with nothing selected records a timeout and advances', () => {
  const s0 = createSession(paper(), perQuestion, 0);
  const { state, effects } = run(s0, [{ type: 'present', at: 0 }, { type: 'expire', at: 30_000 }]);
  assert.equal(state.paper[0]?.outcome, 'timeout');
  assert.equal(state.paper[0]?.timeTakenMs, 30_000);
  assert.equal(state.position, 1);
  const rec = effects.find((e) => e.kind === 'record');
  assert.deepEqual(rec, { kind: 'record', position: 0, selectedIndex: null, outcome: 'timeout', timeTakenMs: 30_000 });
});

test('expire with an option tapped counts it as the answer (documented decision)', () => {
  const s0 = createSession(paper(), perQuestion, 0);
  const { state } = run(s0, [{ type: 'present', at: 0 }, { type: 'select', index: 0 }, { type: 'expire', at: 30_000 }]);
  assert.equal(state.paper[0]?.outcome, 'correct');
  assert.equal(state.paper[0]?.selectedIndex, 0);
});

test('expire on the last question finishes the paper', () => {
  const s0 = createSession(paper(1), { ...perQuestion, questionCount: 1, sectionMix: { 'road-signs': 1, 'rules-of-road-regulations': 0, 'general-driving-principles': 0 } }, 0);
  const { state, effects } = run(s0, [{ type: 'present', at: 0 }, { type: 'expire', at: 30_000 }]);
  assert.equal(state.phase, 'complete');
  assert.equal(effects.at(-1)?.kind, 'finish');
});

test('resume after backgrounding (per-question): elapsed questions time out in order; the tapped option on the on-screen question counts', () => {
  const s0 = createSession(paper(), perQuestion, 0);
  const { state, effects } = run(s0, [
    { type: 'present', at: 0 },
    { type: 'select', index: 0 },           // tapped q0's correct answer, then the phone rang
    { type: 'resume', at: 75_000 },         // away 75 s = 2.5 questions
  ]);
  assert.deepEqual(state.paper.map((p) => p.outcome), ['correct', 'timeout', null, null]);
  assert.deepEqual(state.paper.map((p) => p.presentedAt), [0, 30_000, 60_000, null]);
  assert.equal(state.position, 2);
  assert.equal(state.pendingSelection, null);
  const records = effects.filter((e): e is Extract<Effect, { kind: 'record' }> => e.kind === 'record');
  assert.deepEqual(records.map((r) => [r.position, r.outcome, r.presentedAt]), [[0, 'correct', 0], [1, 'timeout', 30_000]]);
  assert.deepEqual(effects.at(-1), { kind: 'present', position: 2, at: 60_000 });
});

test('resume after a long absence exhausts the paper and finishes it', () => {
  const s0 = createSession(paper(), perQuestion, 0);
  const { state, effects } = run(s0, [{ type: 'present', at: 0 }, { type: 'resume', at: 10 * 60_000 }]);
  assert.equal(state.phase, 'complete');
  assert.deepEqual(state.paper.map((p) => p.outcome), ['timeout', 'timeout', 'timeout', 'timeout']);
  assert.equal(effects.at(-1)?.kind, 'finish');
});

test('resume within the current question changes nothing', () => {
  const s0 = createSession(paper(), perQuestion, 0);
  const { state, effects } = run(s0, [{ type: 'present', at: 0 }, { type: 'select', index: 2 }, { type: 'resume', at: 20_000 }]);
  assert.equal(state.position, 0);
  assert.equal(state.pendingSelection, 2);
  assert.equal(effects.length, 1);
});

test('whole-paper: skip allowed, back allowed, answers revisable; expire scores everything unanswered as timeout', () => {
  const s0 = createSession(paper(), wholePaper, 0);
  const mid = run(s0, [
    { type: 'present', at: 0 },
    { type: 'next', at: 1_000 },                                  // skipped q0
    { type: 'select', index: 1 }, { type: 'next', at: 2_000 },     // q1 correct
    { type: 'previous' }, { type: 'previous' },                    // back to q0
  ]).state;
  assert.equal(mid.position, 0);
  assert.equal(mid.paper[0]?.outcome, 'skipped');
  const { state, effects } = run(s0, [
    { type: 'present', at: 0 },
    { type: 'next', at: 1_000 },
    { type: 'select', index: 1 }, { type: 'next', at: 2_000 },
    { type: 'previous' }, { type: 'previous' },
    { type: 'select', index: 0 }, { type: 'next', at: 3_000 },     // revise q0 → correct
    { type: 'expire', at: 120_000 },                               // paper clock runs out on q1
  ]);
  assert.equal(state.phase, 'complete');
  assert.deepEqual(state.paper.map((p) => p.outcome), ['correct', 'correct', 'timeout', 'timeout']);
  assert.equal(effects.filter((e) => e.kind === 'record' && e.position === 0).length, 2, 'q0 recorded twice: skip, then revision');
});

test('whole-paper: resume past the paper deadline scores immediately; before it, nothing changes', () => {
  const s0 = createSession(paper(), wholePaper, 0);
  const early = run(s0, [{ type: 'present', at: 0 }, { type: 'resume', at: 60_000 }]);
  assert.equal(early.state.phase, 'running');
  const late = run(s0, [{ type: 'present', at: 0 }, { type: 'resume', at: 120_001 }]);
  assert.equal(late.state.phase, 'complete');
});

test('deadline and timer total per mode', () => {
  const pq = run(createSession(paper(), perQuestion, 0), [{ type: 'present', at: 5_000 }]).state;
  assert.equal(currentDeadline(pq), 35_000);
  assert.equal(timerTotalMs(pq), 30_000);
  const wp = createSession(paper(), wholePaper, 10_000);
  assert.equal(currentDeadline(wp), 130_000);
  assert.equal(timerTotalMs(wp), 120_000);
});

test('createSession from persisted rows resumes at the first open question with its saved selection', () => {
  const rows = paper();
  const persisted: PaperItem[] = rows.map((p, i) => (i < 2 ? { ...p, presentedAt: i * 1000, outcome: 'correct', selectedIndex: p.correctIndex } : p));
  const s = createSession(persisted, perQuestion, 0);
  assert.equal(s.position, 2);
  assert.equal(s.phase, 'running');
  const done = createSession(persisted.map((p) => ({ ...p, outcome: 'wrong' as const })), perQuestion, 0);
  assert.equal(done.phase, 'complete');
});

test('clockUnreliable latches once and emits a single effect; abandon ends the session', () => {
  const s0 = createSession(paper(), perQuestion, 0);
  const { state, effects } = run(s0, [{ type: 'clockUnreliable' }, { type: 'clockUnreliable' }]);
  assert.equal(state.timingReliable, false);
  assert.equal(effects.filter((e) => e.kind === 'unreliable').length, 1);
  const ab = reduce(state, { type: 'abandon' });
  assert.equal(ab.state.phase, 'abandoned');
  assert.deepEqual(ab.effects, [{ kind: 'abandon' }]);
  assert.deepEqual(reduce(ab.state, { type: 'select', index: 1 }).effects, [], 'no actions after abandon');
});
