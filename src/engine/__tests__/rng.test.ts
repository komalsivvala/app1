import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hashSeed, newSeed } from '../rng';

test('same seed → same sequence; different seed → different sequence', () => {
  const a = createRng('paper-1');
  const b = createRng('paper-1');
  const c = createRng('paper-2');
  const sa = Array.from({ length: 8 }, () => a.next());
  const sb = Array.from({ length: 8 }, () => b.next());
  const sc = Array.from({ length: 8 }, () => c.next());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
});

test('next() is in [0,1) and int(n) in [0,n)', () => {
  const r = createRng('x');
  for (let i = 0; i < 10_000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
    const k = r.int(7);
    assert.ok(Number.isInteger(k) && k >= 0 && k < 7);
  }
});

test('shuffle is a permutation and does not mutate its input', () => {
  const r = createRng('s');
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const out = r.shuffle(input);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual([...out].sort((a, b) => a - b), input);
  assert.notDeepEqual(out, input);
});

test('hashSeed is stable and the empty seed still yields a working generator', () => {
  assert.equal(hashSeed('abc'), hashSeed('abc'));
  assert.notEqual(hashSeed('abc'), hashSeed('abd'));
  const r = createRng('');
  assert.ok(r.next() >= 0);
});

test('newSeed is unique across calls', () => {
  assert.notEqual(newSeed(1, 0.1), newSeed(1, 0.2));
  assert.notEqual(newSeed(1, 0.1), newSeed(2, 0.1));
});
