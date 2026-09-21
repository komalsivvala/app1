import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { usePrefs } from '@/state/prefs';

import { palettes, type Palette, type Scheme } from './tokens';
import { useSystemScheme } from './use-system-scheme';

export interface Theme {
  readonly scheme: Scheme;
  readonly palette: Palette;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { themePref } = usePrefs();
  const system = useSystemScheme();
  const scheme: Scheme = themePref === 'system' ? system : themePref;
  const value = useMemo<Theme>(() => ({ scheme, palette: palettes[scheme] }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const v = useContext(ThemeContext);
  if (v === null) throw new Error('useTheme must be used inside <ThemeProvider>');
  return v;
}
