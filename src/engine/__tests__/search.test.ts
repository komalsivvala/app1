import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchIndex, normalise, search } from '../search';

const idx = buildSearchIndex([
  { id: 'a', topic: 'road-signs', stem: ['What does this sign mean?'], body: ['Stop', 'Give way', 'No entry', 'Speed limit', 'An octagonal red sign with the word STOP'] },
  { id: 'b', topic: 'rules-of-road-regulations', stem: ['What number would you dial for an ambulance?'], body: ['100', '101', '108', '112', 'Dial 108 in AP.'] },
  { id: 'c', topic: 'general-driving-principles', stem: ['రహదారి గుర్తులు ఎక్కడ ఉంటాయి?'], body: ['ఎడమ', 'కుడి'] },
  { id: 'd', topic: 'rules-of-road-regulations', stem: ['When may you overtake on the left?'], body: ['Never', 'When the vehicle ahead signals right'] },
]);

test('normalise: NFC, lower-case, collapsed whitespace', () => {
  assert.equal(normalise('  Stop  SIGN '), 'stop sign');
  assert.equal(normalise('é'), 'é', 'decomposed é becomes composed');
});

test('finds by option text and by the sign description, not only the stem', () => {
  assert.deepEqual(search(idx, 'no entry').map((h) => h.id), ['a']);
  assert.deepEqual(search(idx, 'octagonal').map((h) => h.id), ['a']);
  assert.deepEqual(search(idx, '108').map((h) => h.id), ['b']);
});

test('stem hits outrank body hits', () => {
  const hits = search(idx, 'overtake');
  assert.equal(hits[0]?.id, 'd');
});

test('every token must match; case-insensitive', () => {
  assert.deepEqual(search(idx, 'AMBULANCE dial').map((h) => h.id), ['b']);
  assert.deepEqual(search(idx, 'ambulance sign'), []);
});

test('Telugu is searchable in the same index', () => {
  assert.deepEqual(search(idx, 'గుర్తులు').map((h) => h.id), ['c']);
  assert.deepEqual(search(idx, 'ఎడమ').map((h) => h.id), ['c']);
});

test('empty and whitespace queries return nothing', () => {
  assert.deepEqual(search(idx, ''), []);
  assert.deepEqual(search(idx, '   '), []);
});

test('limit is honoured', () => {
  assert.equal(search(idx, 'e', 2).length, 2);
});
