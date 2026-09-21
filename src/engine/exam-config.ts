/**
 * The typed view of src/content/exam-config.json. The JSON is the source of
 * truth and is gated by scripts/validate-exam-config.mjs (G-CONFIG); this
 * module only narrows its shape for the engine and the pre-exam screen.
 */
import raw from '@/content/exam-config.json';

export type TopicId = 'road-signs' | 'rules-of-road-regulations' | 'general-driving-principles';

export interface ExamConfig {
  readonly questionCount: number;
  readonly passMark: number;
  readonly timing: {
    readonly mode: 'per-question' | 'whole-paper';
    readonly secondsPerQuestion: number | null;
    readonly totalSeconds: number | null;
  };
  readonly allowBackNavigation: boolean;
  readonly allowSkip: boolean;
  readonly negativeMark: number;
  readonly sectionMix: Readonly<Record<TopicId, number>>;
  readonly formatVerifiedOn: string | null;
}

export const EXAM_CONFIG: ExamConfig = raw as ExamConfig;
