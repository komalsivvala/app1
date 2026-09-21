/**
 * Scoring — docs/02-TRD.md §5.
 * score = correct − (wrong × negativeMark), clamped at 0.
 * Timeouts and skips count as unanswered: 0, never a deduction.
 * Pass iff score >= passMark.
 */
import type { ExamConfig } from './exam-config';

export type Outcome = 'correct' | 'wrong' | 'timeout' | 'skipped';

export interface ScoreSummary {
  readonly correct: number;
  readonly wrong: number;
  readonly timeout: number;
  readonly skipped: number;
  /** Positions never reached (outcome NULL) — an abandoned or force-scored paper. */
  readonly unreached: number;
  readonly score: number;
  readonly passed: boolean;
}

export function scoreAttempt(
  outcomes: readonly (Outcome | null)[],
  config: Pick<ExamConfig, 'passMark' | 'negativeMark'>,
): ScoreSummary {
  let correct = 0;
  let wrong = 0;
  let timeout = 0;
  let skipped = 0;
  let unreached = 0;
  for (const o of outcomes) {
    if (o === 'correct') correct++;
    else if (o === 'wrong') wrong++;
    else if (o === 'timeout') timeout++;
    else if (o === 'skipped') skipped++;
    else unreached++;
  }
  const score = Math.max(0, correct - wrong * config.negativeMark);
  return { correct, wrong, timeout, skipped, unreached, score, passed: score >= config.passMark };
}
