/**
 * The session's time source. Wall-clock for persistence (presented_at and
 * deadlines must survive a kill and relaunch), monotonic for detecting a
 * backwards clock jump. Never trust accumulated ticks — always recompute.
 */
export interface Clock {
  now(): number;
  /** True once a backwards wall-clock jump has been detected. Latches. */
  readonly unreliable: boolean;
}

const TOLERANCE_MS = 2_000;

export function createClock(wall: () => number = Date.now, mono: () => number = () => performance.now()): Clock {
  const wall0 = wall();
  const mono0 = mono();
  let unreliable = false;
  return {
    now() {
      const w = wall();
      const expected = wall0 + (mono() - mono0);
      // A backwards jump: the wall clock is behind what the monotonic clock says
      // it should be. From here on, derive time from the monotonic source so
      // deadlines stay consistent with the timestamps already persisted.
      if (w < expected - TOLERANCE_MS) unreliable = true;
      return unreliable ? Math.round(expected) : w;
    },
    get unreliable() {
      return unreliable;
    },
  };
}
