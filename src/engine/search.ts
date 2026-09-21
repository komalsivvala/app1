/**
 * Bilingual full-text search over the question bank. Pure.
 *
 * Every shipped language is indexed together, so a user typing English finds
 * the Telugu question and vice versa (once Telugu ships). Text is NFC-
 * normalised and lower-cased at index time AND at query time — docs/02-TRD.md
 * §7 — so a Telugu conjunct typed in decomposed form still matches.
 */

export interface SearchDoc {
  readonly id: string;
  readonly topic: string;
  /** The question stem(s), all languages. Matches here rank highest. */
  readonly stem: readonly string[];
  /** Options, explanation, sign name/description. */
  readonly body: readonly string[];
}

export interface SearchIndex {
  readonly entries: readonly { id: string; topic: string; stem: string; body: string }[];
}

export interface SearchHit {
  readonly id: string;
  readonly topic: string;
  readonly score: number;
}

export function normalise(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function buildSearchIndex(docs: readonly SearchDoc[]): SearchIndex {
  return {
    entries: docs.map((d) => ({
      id: d.id,
      topic: d.topic,
      stem: ` ${normalise(d.stem.join(' '))} `,
      body: ` ${normalise(d.body.join(' '))} `,
    })),
  };
}

/** Every query token must appear somewhere; stem hits outrank body hits and
 *  a token at a word start outranks one mid-word. */
export function search(index: SearchIndex, query: string, limit = 50): SearchHit[] {
  const tokens = normalise(query).split(' ').filter((t) => t.length > 0);
  if (tokens.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const e of index.entries) {
    let score = 0;
    for (const t of tokens) {
      const inStem = e.stem.includes(t);
      const inBody = e.body.includes(t);
      if (!inStem && !inBody) {
        score = -1;
        break;
      }
      if (inStem) score += e.stem.includes(` ${t}`) ? 3 : 2;
      if (inBody) score += e.body.includes(` ${t}`) ? 1.5 : 1;
    }
    if (score > 0) hits.push({ id: e.id, topic: e.topic, score });
  }
  hits.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return hits.slice(0, limit);
}
