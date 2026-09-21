/**
 * The config a practice session runs under: the exam reducer, untimed.
 * A null per-question limit yields no deadline (see currentDeadline), so the
 * same persistence and stats paths are exercised without a clock.
 */
import { EXAM_CONFIG, type ExamConfig } from './exam-config';

export const PRACTICE_CONFIG: ExamConfig = {
  ...EXAM_CONFIG,
  timing: { mode: 'per-question', secondsPerQuestion: null, totalSeconds: null },
  allowBackNavigation: false,
  allowSkip: false,
  negativeMark: 0,
};
