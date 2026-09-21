import { useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';

import type { Scheme } from './tokens';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Static web export pre-renders with no media query available. The server
 *  snapshot says "not hydrated" (→ light), the client snapshot says hydrated,
 *  so the real scheme applies after hydration without a server/client
 *  mismatch — and without a setState-in-effect. */
export function useSystemScheme(): Scheme {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const scheme = useColorScheme();
  return hydrated && scheme === 'dark' ? 'dark' : 'light';
}
