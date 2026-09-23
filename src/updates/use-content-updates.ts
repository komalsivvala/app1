import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { transition, type UpdateStatus } from './state';

/** Is a manual check possible in this build? False on web, in development,
 *  and in any build without an update URL — the button is then not shown. */
function updatesAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return Updates.isEnabled === true;
  } catch {
    return false;
  }
}

/**
 * Drives the manual update flow. The ONLY network request the app can make
 * runs inside `press()`, when the user asks for it (app.json sets
 * checkAutomatically: NEVER, so expo-updates never checks on its own).
 */
export function useContentUpdates(): { status: UpdateStatus; press: () => void } {
  const [status, setStatus] = useState<UpdateStatus>(() => (updatesAvailable() ? 'idle' : 'unavailable'));
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const press = useCallback(() => {
    setStatus((current) => {
      const step = transition(current, { type: 'press' });
      if (step.effect === 'check') {
        void (async () => {
          try {
            const result = await Updates.checkForUpdateAsync();
            if (!live.current) return;
            const next = transition('checking', { type: 'checked', available: result.isAvailable });
            setStatus(next.status);
            if (next.effect === 'download') {
              await Updates.fetchUpdateAsync();
              if (live.current) setStatus(transition('downloading', { type: 'downloaded' }).status);
            }
          } catch {
            if (live.current) setStatus((s) => transition(s, { type: 'failed' }).status);
          }
        })();
      } else if (step.effect === 'restart') {
        void Updates.reloadAsync();
      }
      return step.status;
    });
  }, []);

  return { status, press };
}
