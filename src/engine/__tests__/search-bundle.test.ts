import { test } from 'node:test';
import assert from 'node:assert/strict';
import { search } from '../search';
import { getSearchIndex } from '@/content/search-index';
import { QUESTIONS } from '@/content/questions';

test('the real bundle indexes in well under the 150 ms budget and every question is reachable', () => {
  const t0 = performance.now();
  const idx = getSearchIndex();
  const built = performance.now() - t0;
  assert.equal(idx.entries.length, QUESTIONS.length);
  assert.ok(built < 150, `index build took ${built.toFixed(1)} ms`);

  const t1 = performance.now();
  const hits = search(idx, 'speed');
  const queried = performance.now() - t1;
  assert.ok(hits.length > 0);
  assert.ok(queried < 50, `query took ${queried.toFixed(1)} ms`);
});

test('a sign question is found by the sign it shows, although its stem is the generic five words', () => {
  const idx = getSearchIndex();
  const hits = search(idx, 'octagonal').map((h) => h.id);
  assert.ok(hits.length >= 1);
  const q = QUESTIONS.find((x) => x.id === hits[0]);
  assert.equal(q?.signId, 'mandatory-stop');
});

test('the memoised index is the same object on the second call', () => {
  assert.equal(getSearchIndex(), getSearchIndex());
});
