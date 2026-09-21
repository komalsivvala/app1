import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAttempt, type Outcome } from '../scoring';

const cfg = (passMark: number, negativeMark = 0) => ({ passMark, negativeMark });
const outcomes = (correct: number, wrong: number, timeout = 0, skipped = 0, unreached = 0): (Outcome | null)[] => [
  ...Array<Outcome>(correct).fill('correct'),
  ...Array<Outcome>(wrong).fill('wrong'),
  ...Array<Outcome>(timeout).fill('timeout'),
  ...Array<Outcome>(skipped).fill('skipped'),
  ...Array<null>(unreached).fill(null),
];

test('pass iff score >= passMark; 12/20 passes, 11/20 fails', () => {
  assert.equal(scoreAttempt(outcomes(12, 8), cfg(12)).passed, true);
  assert.equal(scoreAttempt(outcomes(11, 9), cfg(12)).passed, false);
});

test('timeouts and skips are 0, never a deduction — even with negative marking on', () => {
  const s = scoreAttempt(outcomes(12, 0, 5, 3), cfg(12, 1));
  assert.equal(s.score, 12);
  assert.equal(s.passed, true);
  assert.deepEqual([s.timeout, s.skipped], [5, 3]);
});

test('negative marking deducts per wrong answer', () => {
  const s = scoreAttempt(outcomes(14, 6), cfg(12, 0.5));
  assert.equal(s.score, 11);
  assert.equal(s.passed, false);
});

test('score is clamped at 0 — a paper can never go negative', () => {
  const s = scoreAttempt(outcomes(1, 19), cfg(12, 1));
  assert.equal(s.score, 0);
  assert.equal(s.passed, false);
});

test('unreached positions are counted separately', () => {
  const s = scoreAttempt(outcomes(3, 1, 0, 0, 16), cfg(12));
  assert.equal(s.unreached, 16);
  assert.equal(s.correct, 3);
});

test('an empty paper scores 0 and fails', () => {
  assert.deepEqual(scoreAttempt([], cfg(1)), { correct: 0, wrong: 0, timeout: 0, skipped: 0, unreached: 0, score: 0, passed: false });
});
