import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE, detectDeviceLanguage, setI18nLocale, type Lang } from '@/i18n';

import { prefsStore } from './prefs-store';

export type ThemePref = 'system' | 'light' | 'dark';

const KEYS = { theme: 'pref.theme', language: 'pref.language' } as const;

export interface Prefs {
  readonly themePref: ThemePref;
  setThemePref(pref: ThemePref): void;
  /** The active UI + content language. Always one of AVAILABLE_LANGUAGES. */
  readonly language: Lang;
  /** False until the user has confirmed a language on the first-launch sheet.
   *  Always true when only one language ships — there is nothing to choose. */
  readonly languageChosen: boolean;
  setLanguage(lang: Lang): void;
}

function readThemePref(): ThemePref {
  const v = prefsStore.get(KEYS.theme);
  return v === 'light' || v === 'dark' ? v : 'system';
}

function readLanguage(): Lang | null {
  const v = prefsStore.get(KEYS.language);
  return v !== null && (AVAILABLE_LANGUAGES as readonly string[]).includes(v) ? (v as Lang) : null;
}

const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  // Both reads are SYNCHRONOUS and happen during the first render, before
  // anything paints. That is the whole reason these two live in kv-store and
  // not in the SQLite tables, which open asynchronously.
  const [themePref, setThemeState] = useState<ThemePref>(readThemePref);
  const [stored, setStored] = useState<Lang | null>(readLanguage);

  const onlyOne = AVAILABLE_LANGUAGES.length === 1;
  const language: Lang = stored ?? (onlyOne ? DEFAULT_LANGUAGE : detectDeviceLanguage());
  const languageChosen = onlyOne || stored !== null;

  useEffect(() => {
    setI18nLocale(language);
  }, [language]);

  const setThemePref = useCallback((pref: ThemePref) => {
    setThemeState(pref);
    prefsStore.set(KEYS.theme, pref);
  }, []);

  const setLanguage = useCallback((lang: Lang) => {
    setStored(lang);
    prefsStore.set(KEYS.language, lang);
  }, []);

  const value = useMemo<Prefs>(
    () => ({ themePref, setThemePref, language, languageChosen, setLanguage }),
    [themePref, setThemePref, language, languageChosen, setLanguage],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const v = useContext(PrefsContext);
  if (v === null) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return v;
}
