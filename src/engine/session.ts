/**
 * The exam session state machine — docs/04-App-Flow.md §3 — as a pure
 * reducer that returns the next state AND the persistence effects it
 * implies. The screen applies the effects to SQLite; tests assert both. No
 * React, no timers, no clock: every action carries the time it happened at.
 */
import type { ExamConfig } from './exam-config';
import type { Outcome } from './scoring';
import { paperDeadline, questionDeadline, reconcilePerQuestion } from './timing';

export type OptionIndex = 0 | 1 | 2 | 3;

export interface PaperItem {
  readonly position: number;
  readonly questionId: string;
  readonly topic: string;
  readonly correctIndex: OptionIndex;
  readonly presentedAt: number | null;
  readonly selectedIndex: OptionIndex | null;
  readonly outcome: Outcome | null;
  readonly timeTakenMs: number | null;
}

export type Phase = 'running' | 'complete' | 'abandoned';

export interface SessionState {
  readonly phase: Phase;
  readonly position: number;
  readonly paper: readonly PaperItem[];
  readonly startedAt: number;
  readonly config: ExamConfig;
  /** The option tapped on the current question but not yet submitted. */
  readonly pendingSelection: OptionIndex | null;
  readonly timingReliable: boolean;
  readonly finishedAt: number | null;
}

export type Effect =
  | { readonly kind: 'present'; readonly position: number; readonly at: number }
  | {
      readonly kind: 'record';
      readonly position: number;
      readonly selectedIndex: OptionIndex | null;
      readonly outcome: Outcome;
      readonly timeTakenMs: number | null;
      /** Set when a question's clock is back-filled after backgrounding. */
      readonly presentedAt?: number;
    }
  | { readonly kind: 'unreliable' }
  | { readonly kind: 'finish'; readonly at: number }
  | { readonly kind: 'abandon' };

export type Action =
  | { readonly type: 'present'; readonly at: number }
  | { readonly type: 'select'; readonly index: OptionIndex }
  | { readonly type: 'next'; readonly at: number }
  | { readonly type: 'previous' }
  | { readonly type: 'expire'; readonly at: number }
  | { readonly type: 'resume'; readonly at: number }
  | { readonly type: 'clockUnreliable' }
  | { readonly type: 'abandon' };

export interface Step {
  readonly state: SessionState;
  readonly effects: readonly Effect[];
}

export function createSession(paper: readonly PaperItem[], config: ExamConfig, startedAt: number): SessionState {
  if (paper.length === 0) throw new Error('a paper needs at least one question');
  // Resume support: land on the first question without an outcome.
  const firstOpen = paper.findIndex((p) => p.outcome === null);
  const position = firstOpen === -1 ? paper.length - 1 : firstOpen;
  const current = paper[position];
  return {
    phase: firstOpen === -1 ? 'complete' : 'running',
    position,
    paper,
    startedAt,
    config,
    pendingSelection: current?.selectedIndex ?? null,
    timingReliable: true,
    finishedAt: null,
  };
}

export function currentDeadline(state: SessionState): number | null {
  const { timing } = state.config;
  if (timing.mode === 'whole-paper') {
    return timing.totalSeconds === null ? null : paperDeadline(state.startedAt, timing.totalSeconds);
  }
  const current = state.paper[state.position];
  if (current === undefined || current.presentedAt === null || timing.secondsPerQuestion === null) return null;
  return questionDeadline(current.presentedAt, timing.secondsPerQuestion);
}

export function timerTotalMs(state: SessionState): number {
  const { timing } = state.config;
  return timing.mode === 'whole-paper' ? (timing.totalSeconds ?? 0) * 1000 : (timing.secondsPerQuestion ?? 0) * 1000;
}

function outcomeFor(selected: OptionIndex | null, correct: OptionIndex, whenUnselected: 'skipped' | 'timeout'): Outcome {
  if (selected === null) return whenUnselected;
  return selected === correct ? 'correct' : 'wrong';
}

function withItem(paper: readonly PaperItem[], position: number, patch: Partial<PaperItem>): PaperItem[] {
  return paper.map((p) => (p.position === position ? { ...p, ...patch } : p));
}

function noop(state: SessionState): Step {
  return { state, effects: [] };
}

/** Advance to `position + 1`, presenting it at `at`, or finish the paper. */
function advance(state: SessionState, at: number, effects: Effect[]): Step {
  const nextPos = state.position + 1;
  if (nextPos >= state.paper.length) {
    effects.push({ kind: 'finish', at });
    return { state: { ...state, phase: 'complete', pendingSelection: null, finishedAt: at }, effects };
  }
  const next = state.paper[nextPos];
  let paper = state.paper;
  if (next !== undefined && next.presentedAt === null) {
    paper = withItem(paper, nextPos, { presentedAt: at });
    effects.push({ kind: 'present', position: nextPos, at });
  }
  return {
    state: { ...state, paper, position: nextPos, pendingSelection: next?.selectedIndex ?? null },
    effects,
  };
}

/** Record the current question with `outcome` and move on. */
function submitCurrent(state: SessionState, at: number, whenUnselected: 'skipped' | 'timeout', timeTakenMs: number | null): Step {
  const current = state.paper[state.position];
  if (current === undefined) return noop(state);
  const selected = state.pendingSelection;
  const outcome = outcomeFor(selected, current.correctIndex, whenUnselected);
  const taken = timeTakenMs ?? (current.presentedAt === null ? null : at - current.presentedAt);
  const effects: Effect[] = [{ kind: 'record', position: state.position, selectedIndex: selected, outcome, timeTakenMs: taken }];
  const paper = withItem(state.paper, state.position, { selectedIndex: selected, outcome, timeTakenMs: taken });
  return advance({ ...state, paper }, at, effects);
}

export function reduce(state: SessionState, action: Action): Step {
  if (state.phase !== 'running') return noop(state);

  switch (action.type) {
    case 'present': {
      const current = state.paper[state.position];
      if (current === undefined || current.presentedAt !== null) return noop(state);
      return {
        state: { ...state, paper: withItem(state.paper, state.position, { presentedAt: action.at }) },
        effects: [{ kind: 'present', position: state.position, at: action.at }],
      };
    }

    case 'select':
      return noop({ ...state, pendingSelection: action.index });

    case 'next': {
      if (state.pendingSelection === null && !state.config.allowSkip) return noop(state);
      return submitCurrent(state, action.at, 'skipped', null);
    }

    case 'previous': {
      if (!state.config.allowBackNavigation || state.position === 0) return noop(state);
      const prevPos = state.position - 1;
      const prev = state.paper[prevPos];
      // A question that ran out of time cannot be revisited.
      if (prev === undefined || prev.outcome === 'timeout') return noop(state);
      return noop({ ...state, position: prevPos, pendingSelection: prev.selectedIndex });
    }

    case 'expire': {
      const { timing } = state.config;
      if (timing.mode === 'per-question') {
        // A tapped-but-unsubmitted option counts as the answer, as the real
        // test's auto-advance does. Nothing tapped → timeout.
        return submitCurrent(state, action.at, 'timeout', (timing.secondsPerQuestion ?? 0) * 1000);
      }
      // Whole paper: everything not yet answered ran out of time.
      const effects: Effect[] = [];
      let paper = state.paper;
      for (const item of state.paper) {
        if (item.outcome !== null) continue;
        const selected = item.position === state.position ? state.pendingSelection : item.selectedIndex;
        const outcome = outcomeFor(selected, item.correctIndex, 'timeout');
        effects.push({ kind: 'record', position: item.position, selectedIndex: selected, outcome, timeTakenMs: null });
        paper = withItem(paper, item.position, { selectedIndex: selected, outcome });
      }
      effects.push({ kind: 'finish', at: action.at });
      return { state: { ...state, paper, phase: 'complete', pendingSelection: null, finishedAt: action.at }, effects };
    }

    case 'resume': {
      const { timing } = state.config;
      if (timing.mode === 'whole-paper') {
        const deadline = currentDeadline(state);
        return deadline !== null && action.at >= deadline ? reduce(state, { type: 'expire', at: action.at }) : noop(state);
      }
      const per = timing.secondsPerQuestion ?? 0;
      const rec = reconcilePerQuestion(state.paper, state.position, action.at, per);
      if (rec.timedOut.length === 0) return noop(state);

      const effects: Effect[] = [];
      let paper = state.paper;
      rec.timedOut.forEach(({ position, presentedAt }, i) => {
        const item = paper[position];
        if (item === undefined) return;
        // Only the question that was on screen can carry a tapped option.
        const selected = i === 0 ? state.pendingSelection : null;
        const outcome = outcomeFor(selected, item.correctIndex, 'timeout');
        effects.push({ kind: 'record', position, selectedIndex: selected, outcome, timeTakenMs: per * 1000, presentedAt });
        paper = withItem(paper, position, { presentedAt, selectedIndex: selected, outcome, timeTakenMs: per * 1000 });
      });
      if (rec.next === null) {
        effects.push({ kind: 'finish', at: action.at });
        return { state: { ...state, paper, phase: 'complete', pendingSelection: null, finishedAt: action.at }, effects };
      }
      paper = withItem(paper, rec.next.position, { presentedAt: rec.next.presentedAt });
      effects.push({ kind: 'present', position: rec.next.position, at: rec.next.presentedAt });
      return { state: { ...state, paper, position: rec.next.position, pendingSelection: null }, effects };
    }

    case 'clockUnreliable':
      return state.timingReliable ? { state: { ...state, timingReliable: false }, effects: [{ kind: 'unreliable' }] } : noop(state);

    case 'abandon':
      return { state: { ...state, phase: 'abandoned', pendingSelection: null }, effects: [{ kind: 'abandon' }] };
  }
}
