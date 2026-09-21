/**
 * UI strings. Content strings (questions) come from src/content/questions.ts —
 * different lifecycle, different source of truth — never from here.
 *
 * The set of UI locales is derived from src/content/content-config.json: you
 * cannot offer a Telugu UI around English questions. v1 ships ["en"] (PRD A1).
 */
import { I18n, type TranslateOptions } from 'i18n-js';
import { getLocales } from 'expo-localization';

import contentConfig from '@/content/content-config.json';
import en from './en.json';

export type Lang = 'en' | 'te';

export const AVAILABLE_LANGUAGES: readonly Lang[] = contentConfig.languages as Lang[];
export const DEFAULT_LANGUAGE: Lang = contentConfig.defaultLanguage as Lang;

// A locale file may only be registered when its language ships; scripts/check-i18n.mjs
// enforces key parity across every file present.
const translations: Partial<Record<Lang, typeof en>> = { en };

export const i18n = new I18n(translations);
i18n.defaultLocale = DEFAULT_LANGUAGE;
i18n.enableFallback = true;
i18n.locale = DEFAULT_LANGUAGE;

/** Dot-path keys of en.json, so a typo in t('home.startMock') is a compile error.
 *  A `{ one, other }` object is a plural form and counts as ONE key — i18n-js
 *  picks the form from `count` (t('bookmarks.count', { count })). */
type PluralForms = { readonly one: string; readonly other: string };
type Leaves<T, P extends string = ''> = T extends string
  ? P
  : T extends PluralForms
    ? P
    : { [K in keyof T & string]: Leaves<T[K], P extends '' ? K : `${P}.${K}`> }[keyof T & string];
export type TKey = Leaves<typeof en>;

export function translate(key: TKey, options?: TranslateOptions): string {
  return i18n.t(key, options);
}

export function setI18nLocale(lang: Lang): void {
  i18n.locale = lang;
}

/** Device language if we ship it, else the default. Used to PRE-SELECT the
 *  first-launch sheet (when more than one language ships) — the user confirms. */
export function detectDeviceLanguage(): Lang {
  const code = getLocales()[0]?.languageCode ?? null;
  return code !== null && (AVAILABLE_LANGUAGES as readonly string[]).includes(code)
    ? (code as Lang)
    : DEFAULT_LANGUAGE;
}
