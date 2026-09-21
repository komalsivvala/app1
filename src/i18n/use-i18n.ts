import { useMemo } from 'react';
import type { TranslateOptions } from 'i18n-js';

import { usePrefs } from '@/state/prefs';

import { i18n, type Lang, type TKey } from './index';

export interface I18nApi {
  readonly lang: Lang;
  t(key: TKey, options?: TranslateOptions): string;
}

/** `t` is rebuilt when the language changes, so every consumer re-renders in
 *  place — the "instant and total" switch from docs/04-App-Flow.md §6. */
export function useI18n(): I18nApi {
  const { language } = usePrefs();
  return useMemo<I18nApi>(
    () => ({
      lang: language,
      t: (key, options) => i18n.t(key, { ...options, locale: language }),
    }),
    [language],
  );
}
