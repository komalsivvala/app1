import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { ThemeProvider } from '@/design/theme';
import { PrefsProvider } from '@/state/prefs';

function Providers({ children }: { children: ReactNode }) {
  return (
    <PrefsProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </PrefsProvider>
  );
}

/** render() with the app's real prefs + theme providers around the tree.
 *  RNTL 14 renders asynchronously under React 19 — always `await` this. */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Providers, ...options });
}
