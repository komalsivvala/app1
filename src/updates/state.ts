/**
 * The manual content-update flow as a pure state machine, so the screen is a
 * projection and the transitions are unit-tested in plain Node.
 *
 * Nothing here talks to the network; use-content-updates.ts drives it with
 * expo-updates. There is no automatic check anywhere in the app: the only
 * request happens when the user presses the button (option 3 of the EAS
 * Update decision, docs/store-submission.md §1.2).
 */
export type UpdateStatus =
  | 'unavailable' // updates not configured in this build (dev, web, no URL)
  | 'idle'
  | 'checking'
  | 'upToDate'
  | 'downloading'
  | 'ready' // downloaded; a restart applies it
  | 'error';

export type UpdateEvent =
  | { type: 'press' }
  | { type: 'checked'; available: boolean }
  | { type: 'downloaded' }
  | { type: 'failed' };

/** Which side effect the driver should run after a transition, if any. */
export type UpdateEffect = 'check' | 'download' | 'restart' | null;

export function transition(status: UpdateStatus, event: UpdateEvent): { status: UpdateStatus; effect: UpdateEffect } {
  switch (event.type) {
    case 'press':
      if (status === 'ready') return { status, effect: 'restart' };
      if (status === 'idle' || status === 'upToDate' || status === 'error') return { status: 'checking', effect: 'check' };
      return { status, effect: null }; // unavailable, checking, downloading: ignore
    case 'checked':
      if (status !== 'checking') return { status, effect: null };
      return event.available ? { status: 'downloading', effect: 'download' } : { status: 'upToDate', effect: null };
    case 'downloaded':
      return status === 'downloading' ? { status: 'ready', effect: null } : { status, effect: null };
    case 'failed':
      return status === 'checking' || status === 'downloading' ? { status: 'error', effect: null } : { status, effect: null };
  }
}

/** The button is pressable only in the states where a press does something. */
export function isActionable(status: UpdateStatus): boolean {
  return status === 'idle' || status === 'upToDate' || status === 'error' || status === 'ready';
}
