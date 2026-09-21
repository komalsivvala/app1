import { useColorScheme } from 'react-native';

import type { Scheme } from './tokens';

/** RN 0.86 can return 'unspecified' as well as null; anything not dark is light. */
export function useSystemScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}
