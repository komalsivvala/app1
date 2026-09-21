/**
 * Paper sampling — docs/02-TRD.md §5.
 *
 * Honour sectionMix exactly; never repeat within a paper; weight candidates
 * by priority: never seen (4×) → wrong last time (3×) → accuracy < 60% (2×)
 * → everything else (1×). The weights read the EXAM columns of question_stats
 * only, so flashcard self-assessment cannot fool the engine.
 */
import { TOPICS, type ExamConfig, type TopicId } from './exam-config';
import type { Rng } from './rng';

export interface CandidateStats {
  readonly examSeen: number;
  readonly examCorrect: number;
  readonly lastResult: 'correct' | 'wrong' | 'timeout' | null;
}

export interface Candidate {
  readonly id: string;
  readonly topic: TopicId;
}

export type PriorityWeight = 1 | 2 | 3 | 4;

/** Absent from question_stats entirely counts as never seen. A 'timeout'
 *  last result deliberately does NOT score 3: running out of time is not the
 *  same as not knowing it, so it falls through to the accuracy test. */
export function priorityWeight(stats: CandidateStats | undefined): PriorityWeight {
  if (stats === undefined || stats.examSeen === 0) return 4;
  if (stats.lastResult === 'wrong') return 3;
  if (stats.examCorrect / stats.examSeen < 0.6) return 2;
  return 1;
}

/** Weighted sampling WITHOUT replacement — the "never repeat" guarantee. */
export function weightedSampleWithoutReplacement<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  count: number,
  rng: Rng,
): T[] {
  if (count > items.length) {
    throw new RangeError(`cannot sample ${count} from ${items.length} items without replacement`);
  }
  const pool = items.slice();
  const out: T[] = [];
  while (out.length < count) {
    const total = pool.reduce((sum, item) => sum + weightOf(item), 0);
    let r = rng.next() * total;
    let chosen = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      const item = pool[i];
      if (item === undefined) continue;
      r -= weightOf(item);
      if (r < 0) {
        chosen = i;
        break;
      }
    }
    const picked = pool.splice(chosen, 1)[0];
    if (picked === undefined) throw new Error('sampling invariant violated');
    out.push(picked);
  }
  return out;
}

export function samplePaper(
  candidates: readonly Candidate[],
  stats: ReadonlyMap<string, CandidateStats>,
  config: ExamConfig,
  rng: Rng,
): Candidate[] {
  const byTopic = new Map<TopicId, Candidate[]>();
  for (const c of candidates) {
    const bucket = byTopic.get(c.topic);
    if (bucket === undefined) byTopic.set(c.topic, [c]);
    else bucket.push(c);
  }

  const picked: Candidate[] = [];
  for (const topic of TOPICS) {
    const want = config.sectionMix[topic];
    const pool = byTopic.get(topic) ?? [];
    if (pool.length < want) {
      throw new Error(`topic ${topic} has ${pool.length} shippable questions but sectionMix needs ${want}`);
    }
    picked.push(...weightedSampleWithoutReplacement(pool, (c) => priorityWeight(stats.get(c.id)), want, rng));
  }
  if (picked.length !== config.questionCount) {
    throw new Error(`sectionMix produced ${picked.length} questions, questionCount is ${config.questionCount}`);
  }
  // Topics are mixed through the paper, as in the real test.
  return rng.shuffle(picked);
}
