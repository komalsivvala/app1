/**
 * The search index over the shipped bundle. Built on FIRST USE and memoised —
 * never at module scope, which would run on every cold start for every user
 * against the <2 s budget (docs/02-TRD.md §8).
 */
import { buildSearchIndex, type SearchDoc, type SearchIndex } from '@/engine/search';

import { LANGUAGES, QUESTIONS, SIGNS, type Localized } from './questions';

let cached: SearchIndex | null = null;

function all(l: Localized | null): string[] {
  if (l === null) return [];
  return LANGUAGES.map((lang) => l[lang]);
}

export function getSearchIndex(): SearchIndex {
  if (cached !== null) return cached;
  const signById = new Map(SIGNS.map((s) => [s.id, s]));
  const docs: SearchDoc[] = QUESTIONS.map((q) => {
    const sign = q.signId === null ? undefined : signById.get(q.signId);
    return {
      id: q.id,
      topic: q.topic,
      stem: all(q.text),
      body: [
        ...q.options.flatMap((o) => all(o)),
        ...all(q.explanation),
        ...all(q.signAlt),
        ...(sign === undefined ? [] : [...all(sign.name), ...all(sign.meaning)]),
      ],
    };
  });
  cached = buildSearchIndex(docs);
  return cached;
}
