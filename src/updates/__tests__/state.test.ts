import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isActionable, transition, type UpdateStatus } from '../state';

test('a press from idle checks; an update found downloads; downloaded is ready; a press then restarts', () => {
  let s = transition('idle', { type: 'press' });
  assert.deepEqual(s, { status: 'checking', effect: 'check' });
  s = transition(s.status, { type: 'checked', available: true });
  assert.deepEqual(s, { status: 'downloading', effect: 'download' });
  s = transition(s.status, { type: 'downloaded' });
  assert.deepEqual(s, { status: 'ready', effect: null });
  s = transition(s.status, { type: 'press' });
  assert.deepEqual(s, { status: 'ready', effect: 'restart' });
});

test('nothing available ends up-to-date, and a later press checks again', () => {
  const s = transition('checking', { type: 'checked', available: false });
  assert.deepEqual(s, { status: 'upToDate', effect: null });
  assert.deepEqual(transition('upToDate', { type: 'press' }), { status: 'checking', effect: 'check' });
});

test('a failure during check or download is an error the user can retry; failures elsewhere are ignored', () => {
  assert.equal(transition('checking', { type: 'failed' }).status, 'error');
  assert.equal(transition('downloading', { type: 'failed' }).status, 'error');
  assert.deepEqual(transition('error', { type: 'press' }), { status: 'checking', effect: 'check' });
  assert.deepEqual(transition('idle', { type: 'failed' }), { status: 'idle', effect: null });
});

test('unavailable never leaves unavailable — no request can happen in a build without updates', () => {
  for (const e of [{ type: 'press' } as const, { type: 'checked', available: true } as const, { type: 'downloaded' } as const]) {
    assert.deepEqual(transition('unavailable', e), { status: 'unavailable', effect: null });
  }
});

test('a press while checking or downloading is ignored (no double request); stale results are ignored', () => {
  assert.deepEqual(transition('checking', { type: 'press' }), { status: 'checking', effect: null });
  assert.deepEqual(transition('downloading', { type: 'press' }), { status: 'downloading', effect: null });
  assert.deepEqual(transition('idle', { type: 'checked', available: true }), { status: 'idle', effect: null });
});

test('isActionable matches the states where a press has an effect', () => {
  const all: UpdateStatus[] = ['unavailable', 'idle', 'checking', 'upToDate', 'downloading', 'ready', 'error'];
  for (const s of all) assert.equal(isActionable(s), transition(s, { type: 'press' }).effect !== null, s);
});
