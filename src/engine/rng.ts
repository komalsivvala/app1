/**
 * Seeded PRNG (mulberry32 over an FNV-1a hash of the seed string).
 * Deterministic, so sampling tests are reproducible and a paper can be
 * regenerated from `attempts.seed` for a bug report. NOT for resume — the
 * paper is persisted at creation (docs/05-Data-Schema.md §4).
 */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Fisher–Yates; returns a new array. */
  shuffle<T>(items: readonly T[]): T[];
}

export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRng(seed: string): Rng {
  let a = hashSeed(seed) || 0x9e3779b9;
  const next = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(maxExclusive) {
      if (!(maxExclusive > 0)) throw new RangeError(`int(): max must be > 0, got ${maxExclusive}`);
      return Math.floor(next() * maxExclusive);
    },
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i];
        const other = out[j];
        if (tmp !== undefined && other !== undefined) {
          out[i] = other;
          out[j] = tmp;
        }
      }
      return out;
    },
  };
}

export function newSeed(now: number = Date.now(), entropy: number = Math.random()): string {
  return `${now.toString(36)}-${Math.floor(entropy * 0xffffffff).toString(36)}`;
}
