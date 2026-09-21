/**
 * Lookups over the generated bundle. Built lazily on first use, not at module
 * scope — docs/02-TRD.md §8: nothing runs during evaluation on every cold start.
 */
import type { Lang } from '@/i18n';

import { QUESTIONS, type Localized, type Question } from './questions';

let byId: Map<string, Question> | null = null;

export function questionById(id: string): Question | undefined {
  if (byId === null) byId = new Map(QUESTIONS.map((q) => [q.id, q]));
  return byId.get(id);
}

/** The string for the active language, falling back to the first shipped
 *  language. `Lang` can name a language the bundle does not carry yet
 *  (planned languages), so this is the one sanctioned place to cross that gap. */
export function localized(value: Localized, lang: Lang): string {
  const v = (value as Partial<Record<Lang, string>>)[lang];
  if (v !== undefined) return v;
  return Object.values(value)[0] ?? '';
}
