import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../rng';
import { priorityWeight, samplePaper, weightedSampleWithoutReplacement, type Candidate, type CandidateStats } from '../selection';
import type { ExamConfig } from '../exam-config';

const config: ExamConfig = {
  questionCount: 20,
  passMark: 12,
  timing: { mode: 'per-question', secondsPerQuestion: 30, totalSeconds: null },
  allowBackNavigation: false,
  allowSkip: false,
  negativeMark: 0,
  sectionMix: { 'road-signs': 8, 'rules-of-road-regulations': 7, 'general-driving-principles': 5 },
  formatVerifiedOn: null,
};

function bank(counts: Record<string, number>): Candidate[] {
  const out: Candidate[] = [];
  for (const [topic, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) out.push({ id: `${topic}-${i}`, topic: topic as Candidate['topic'] });
  }
  return out;
}
const BANK = bank({ 'road-signs': 91, 'rules-of-road-regulations': 108, 'general-driving-principles': 78 });

test('priorityWeight: never-seen 4, wrong-last 3, accuracy<60% 2, else 1; timeout does not score 3', () => {
  const s = (examSeen: number, examCorrect: number, lastResult: CandidateStats['lastResult']): CandidateStats => ({ examSeen, examCorrect, lastResult });
  assert.equal(priorityWeight(undefined), 4);
  assert.equal(priorityWeight(s(0, 0, null)), 4);
  assert.equal(priorityWeight(s(4, 3, 'wrong')), 3);
  assert.equal(priorityWeight(s(5, 2, 'correct')), 2);
  assert.equal(priorityWeight(s(5, 5, 'correct')), 1);
  assert.equal(priorityWeight(s(5, 4, 'timeout')), 1);
  assert.equal(priorityWeight(s(5, 2, 'timeout')), 2);
});

test('samplePaper honours sectionMix EXACTLY and never repeats a question', () => {
  for (let run = 0; run < 50; run++) {
    const paper = samplePaper(BANK, new Map(), config, createRng(`run-${run}`));
    assert.equal(paper.length, 20);
    assert.equal(new Set(paper.map((q) => q.id)).size, 20, 'no repeats within a paper');
    const byTopic = paper.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.topic]: (acc[q.topic] ?? 0) + 1 }), {});
    assert.deepEqual(byTopic, { 'road-signs': 8, 'rules-of-road-regulations': 7, 'general-driving-principles': 5 });
  }
});

test('samplePaper is deterministic for a seed', () => {
  const a = samplePaper(BANK, new Map(), config, createRng('seed-42')).map((q) => q.id);
  const b = samplePaper(BANK, new Map(), config, createRng('seed-42')).map((q) => q.id);
  const c = samplePaper(BANK, new Map(), config, createRng('seed-43')).map((q) => q.id);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('topics are mixed through the paper, not blocked', () => {
  const paper = samplePaper(BANK, new Map(), config, createRng('mix'));
  const firstEight = paper.slice(0, 8).map((q) => q.topic);
  assert.ok(new Set(firstEight).size > 1, `first eight were all ${firstEight[0]}`);
});

test('never-seen questions are favoured over mastered ones (weak-area weighting)', () => {
  // 8 road-sign slots; 20 mastered candidates (weight 1) vs 20 never-seen (weight 4).
  const small = bank({ 'road-signs': 40, 'rules-of-road-regulations': 7, 'general-driving-principles': 5 });
  const stats = new Map<string, CandidateStats>();
  for (let i = 0; i < 20; i++) stats.set(`road-signs-${i}`, { examSeen: 5, examCorrect: 5, lastResult: 'correct' });
  let neverSeenPicks = 0;
  const RUNS = 300;
  for (let run = 0; run < RUNS; run++) {
    const paper = samplePaper(small, stats, config, createRng(`w-${run}`));
    neverSeenPicks += paper.filter((q) => q.topic === 'road-signs' && !stats.has(q.id)).length;
  }
  const share = neverSeenPicks / (RUNS * 8);
  // Expected ≈ 4/(4+1) = 0.8 under weighted sampling; ≈ 0.5 if weights were ignored.
  assert.ok(share > 0.7 && share < 0.9, `never-seen share was ${share.toFixed(3)}`);
});

test('a topic with fewer questions than its slot fails loudly (G-MIX at runtime)', () => {
  const thin = bank({ 'road-signs': 7, 'rules-of-road-regulations': 7, 'general-driving-principles': 5 });
  assert.throws(() => samplePaper(thin, new Map(), config, createRng('x')), /road-signs has 7 .* needs 8/);
});

test('weightedSampleWithoutReplacement: exact count, distinct, refuses over-draw', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];
  const out = weightedSampleWithoutReplacement(items, () => 1, 5, createRng('all'));
  assert.deepEqual([...out].sort(), items);
  assert.throws(() => weightedSampleWithoutReplacement(items, () => 1, 6, createRng('x')), RangeError);
});
