import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../clock';
import { paperDeadline, questionDeadline, reconcilePerQuestion, remainingMs, type TimedRow } from '../timing';

const rows = (n: number, presentedAtFirst: number | null, current = 0): TimedRow[] =>
  Array.from({ length: n }, (_, position) => ({
    position,
    presentedAt: position === current ? presentedAtFirst : position < current ? 0 : null,
    outcome: position < current ? 'correct' : null,
  }));

test('deadlines and remaining time', () => {
  assert.equal(questionDeadline(1_000, 30), 31_000);
  assert.equal(paperDeadline(5_000, 600), 605_000);
  assert.equal(remainingMs(31_000, 20_000), 11_000);
  assert.equal(remainingMs(31_000, 40_000), 0, 'clamped at zero');
});

test('per-question reconcile: still within time → no change', () => {
  const r = reconcilePerQuestion(rows(20, 100_000, 3), 3, 100_000 + 29_999, 30);
  assert.deepEqual(r.timedOut, []);
  assert.deepEqual(r.next, { position: 3, presentedAt: 100_000 });
});

test('per-question reconcile: away for 2.5 questions → two time out, the third has been live 15 s', () => {
  const r = reconcilePerQuestion(rows(20, 100_000, 3), 3, 100_000 + 75_000, 30);
  assert.deepEqual(r.timedOut, [
    { position: 3, presentedAt: 100_000 },
    { position: 4, presentedAt: 130_000 },
  ]);
  assert.deepEqual(r.next, { position: 5, presentedAt: 160_000 });
});

test('per-question reconcile: away long enough to exhaust the paper → all remaining time out, next is null', () => {
  const r = reconcilePerQuestion(rows(5, 0, 2), 2, 30_000 * 10, 30);
  assert.deepEqual(r.timedOut.map((t) => t.position), [2, 3, 4]);
  assert.equal(r.next, null);
});

test('per-question reconcile: exactly one full question elapsed → that one times out, next starts now', () => {
  const r = reconcilePerQuestion(rows(20, 0, 0), 0, 30_000, 30);
  assert.deepEqual(r.timedOut, [{ position: 0, presentedAt: 0 }]);
  assert.deepEqual(r.next, { position: 1, presentedAt: 30_000 });
});

test('a current question never presented starts its clock now', () => {
  const r = reconcilePerQuestion(rows(20, null, 0), 0, 55_000, 30);
  assert.deepEqual(r, { timedOut: [], next: { position: 0, presentedAt: 55_000 } });
});

test('clock: follows the wall clock normally', () => {
  let wall = 1_000_000;
  let mono = 0;
  const c = createClock(() => wall, () => mono);
  wall += 5_000;
  mono += 5_000;
  assert.equal(c.now(), 1_005_000);
  assert.equal(c.unreliable, false);
});

test('clock: a backwards wall-clock jump is detected, latches, and time continues from the monotonic source', () => {
  let wall = 1_000_000;
  let mono = 0;
  const c = createClock(() => wall, () => mono);
  mono += 10_000;
  wall += 10_000 - 60_000; // user set the clock back a minute
  assert.equal(c.now(), 1_010_000, 'derived from monotonic elapsed, not the jumped wall clock');
  assert.equal(c.unreliable, true);
  mono += 1_000;
  wall += 1_000;
  assert.equal(c.now(), 1_011_000, 'stays on the monotonic-derived source afterwards');
  assert.equal(c.unreliable, true);
});

test('clock: a small backwards drift within tolerance is ignored', () => {
  let wall = 1_000_000;
  let mono = 0;
  const c = createClock(() => wall, () => mono);
  mono += 10_000;
  wall += 10_000 - 500;
  c.now();
  assert.equal(c.unreliable, false);
});
