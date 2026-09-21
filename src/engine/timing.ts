/**
 * Deadline arithmetic — docs/02-TRD.md §5 and docs/04-App-Flow.md §3.
 * Pure. The session reducer calls these; the ExamTimer leaf uses remaining().
 */
import type { Outcome } from './scoring';

export function questionDeadline(presentedAt: number, secondsPerQuestion: number): number {
  return presentedAt + secondsPerQuestion * 1000;
}

export function paperDeadline(startedAt: number, totalSeconds: number): number {
  return startedAt + totalSeconds * 1000;
}

export function remainingMs(deadline: number, now: number): number {
  return Math.max(0, deadline - now);
}

export interface TimedRow {
  readonly position: number;
  readonly presentedAt: number | null;
  readonly outcome: Outcome | null;
}

export interface PerQuestionReconciliation {
  /** Questions that ran out while the app was away, in order, with the
   *  presented_at each would have had if the paper had kept advancing. */
  readonly timedOut: readonly { position: number; presentedAt: number }[];
  /** The first question still live, and when its clock started; null when the
   *  paper is exhausted and must be scored. */
  readonly next: { position: number; presentedAt: number } | null;
}

/**
 * Per-question mode, after backgrounding or relaunch. The real test keeps
 * advancing while you are away: each question gets its full time and then the
 * next starts. So `k = floor(elapsed / perQuestion)` questions have timed out
 * starting at the current one, and the question after them has been "live"
 * for the remainder. Returns no change when the current question is still
 * within its time.
 */
export function reconcilePerQuestion(
  rows: readonly TimedRow[],
  currentPosition: number,
  now: number,
  secondsPerQuestion: number,
): PerQuestionReconciliation {
  const current = rows[currentPosition];
  const last = rows.length - 1;
  if (current === undefined || current.presentedAt === null) {
    return { timedOut: [], next: { position: currentPosition, presentedAt: now } };
  }
  const per = secondsPerQuestion * 1000;
  const elapsed = now - current.presentedAt;
  const k = Math.floor(elapsed / per);
  if (k <= 0) return { timedOut: [], next: { position: currentPosition, presentedAt: current.presentedAt } };

  const timedOut: { position: number; presentedAt: number }[] = [];
  for (let i = 0; i < k && currentPosition + i <= last; i++) {
    timedOut.push({ position: currentPosition + i, presentedAt: current.presentedAt + i * per });
  }
  const nextPosition = currentPosition + k;
  const next = nextPosition <= last ? { position: nextPosition, presentedAt: current.presentedAt + k * per } : null;
  return { timedOut, next };
}
