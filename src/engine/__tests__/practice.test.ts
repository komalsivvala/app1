import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../rng';
import { practiceWeight, samplePractice, PRACTICE_SIZE, type Candidate, type CandidateStats } from '../selection';

const bank: Candidate[] = Array.from({ length: 30 }, (_, i) => ({ id: `q${i}`, topic: 'road-signs' }));
const s = (examSeen: number, examCorrect: number, lastResult: CandidateStats['lastResult']): CandidateStats => ({ examSeen, examCorrect, lastResult });

test('practiceWeight: wrong-last 4 > accuracy<60% 3 > never-seen 2; mastered excluded (0)', () => {
  assert.equal(practiceWeight(undefined), 2);
  assert.equal(practiceWeight(s(3, 2, 'wrong')), 4);
  assert.equal(practiceWeight(s(5, 2, 'correct')), 3);
  assert.equal(practiceWeight(s(5, 5, 'correct')), 0);
  assert.equal(practiceWeight(s(5, 4, 'timeout')), 0, 'a timeout with good accuracy is not a weak area');
});

test('samplePractice draws up to PRACTICE_SIZE distinct questions from the weak pool only', () => {
  const stats = new Map<string, CandidateStats>();
  for (let i = 0; i < 20; i++) stats.set(`q${i}`, s(5, 5, 'correct')); // mastered
  stats.set('q20', s(4, 1, 'wrong'));
  stats.set('q21', s(5, 2, 'correct'));
  // q22..q29 never seen
  const out = samplePractice(bank, stats, createRng('p'));
  assert.equal(out.length, PRACTICE_SIZE);
  assert.equal(new Set(out.map((c) => c.id)).size, PRACTICE_SIZE);
  for (const c of out) assert.ok(practiceWeight(stats.get(c.id)) > 0, `${c.id} is mastered and must not be drawn`);
  assert.ok(out.some((c) => c.id === 'q20'), 'the wrong-last-time question is (near-)always drawn at weight 4');
});

test('a pool smaller than the minimum yields an empty session (the "no weak areas" state)', () => {
  const stats = new Map<string, CandidateStats>();
  for (let i = 0; i < 28; i++) stats.set(`q${i}`, s(5, 5, 'correct'));
  assert.deepEqual(samplePractice(bank, stats, createRng('x')), []);
});

test('a small pool above the minimum yields the whole pool', () => {
  const stats = new Map<string, CandidateStats>();
  for (let i = 0; i < 26; i++) stats.set(`q${i}`, s(5, 5, 'correct'));
  const out = samplePractice(bank, stats, createRng('y'));
  assert.deepEqual([...out.map((c) => c.id)].sort(), ['q26', 'q27', 'q28', 'q29']);
});

test('deterministic for a seed', () => {
  const a = samplePractice(bank, new Map(), createRng('s1')).map((c) => c.id);
  const b = samplePractice(bank, new Map(), createRng('s1')).map((c) => c.id);
  assert.deepEqual(a, b);
});
