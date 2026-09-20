/**
 * Tests for gate G-CONFIG.
 *
 * Uses node:test so it runs with zero install — this suite has to be able to
 * gate the config before the Expo app (and its node_modules) exists.
 * It is re-asserted from the Jest content suite once that exists.
 *
 * Run: node --test scripts/__tests__/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateExamConfig } from '../validate-exam-config.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(HERE, '../../src/content/exam-config.json');

/** A known-good config, cloned per test so mutations don't leak. */
const good = () => ({
  questionCount: 20,
  passMark: 12,
  timing: { mode: 'per-question', secondsPerQuestion: 30, totalSeconds: null },
  allowBackNavigation: false,
  allowSkip: false,
  negativeMark: 0,
  sectionMix: { 'road-signs': 8, 'rules-of-road-regulations': 7, 'general-driving-principles': 5 },
  formatVerifiedOn: null,
});

/** Assert the config fails, and that some error mentions `needle`. */
const failsWith = (config, needle) => {
  const { errors } = validateExamConfig(config);
  assert.ok(errors.length > 0, `expected at least one error, got none`);
  assert.ok(
    errors.some((e) => e.toLowerCase().includes(needle.toLowerCase())),
    `expected an error mentioning "${needle}", got:\n  ${errors.join('\n  ')}`,
  );
};

test('the config actually shipped in src/content passes', () => {
  const shipped = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  const { errors } = validateExamConfig(shipped);
  assert.deepEqual(errors, [], `shipped exam-config.json must pass G-CONFIG`);
});

test('the shipped config leaves formatVerifiedOn null until an RTO visit confirms it', () => {
  const shipped = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  assert.equal(
    shipped.formatVerifiedOn,
    null,
    'formatVerifiedOn must ship null — setting it asserts a verification that has not happened',
  );
});

test('a known-good config passes with no errors', () => {
  const { errors } = validateExamConfig(good());
  assert.deepEqual(errors, []);
});

// --- the invariants JSON Schema cannot express -----------------------

test('sectionMix that does not sum to questionCount fails (G-MIX)', () => {
  const c = good();
  c.sectionMix['road-signs'] = 9; // sums to 21, questionCount is 20
  failsWith(c, 'sums to 21');
});

test('sectionMix summing short of questionCount also fails', () => {
  const c = good();
  c.sectionMix['general-driving-principles'] = 4; // sums to 19
  failsWith(c, 'sums to 19');
});

test('changing questionCount without changing sectionMix fails loudly', () => {
  const c = good();
  c.questionCount = 15; // the single most likely edit after an RTO visit
  failsWith(c, 'G-MIX');
});

test('passMark above questionCount fails as unpassable', () => {
  const c = good();
  c.passMark = 21;
  failsWith(c, 'unpassable');
});

test('per-question mode with a null secondsPerQuestion fails', () => {
  const c = good();
  c.timing.secondsPerQuestion = null;
  failsWith(c, 'secondsPerQuestion');
});

test('per-question mode with a non-null totalSeconds fails — two live clocks', () => {
  const c = good();
  c.timing.totalSeconds = 600;
  failsWith(c, 'two live clocks');
});

test('whole-paper mode requires totalSeconds and a null secondsPerQuestion', () => {
  const c = good();
  c.timing.mode = 'whole-paper'; // left secondsPerQuestion: 30, totalSeconds: null
  const { errors } = validateExamConfig(c);
  assert.equal(errors.length, 2, `expected both clock errors, got:\n  ${errors.join('\n  ')}`);

  const ok = good();
  ok.timing = { mode: 'whole-paper', secondsPerQuestion: null, totalSeconds: 600 };
  assert.deepEqual(validateExamConfig(ok).errors, []);
});

test('an unknown timing mode fails rather than silently defaulting', () => {
  const c = good();
  c.timing.mode = 'per-section';
  failsWith(c, 'timing.mode');
});

test('a future formatVerifiedOn fails — it records a visit already made', () => {
  const c = good();
  c.formatVerifiedOn = '2099-01-01';
  failsWith(c, 'future');
});

test('a malformed formatVerifiedOn fails', () => {
  const c = good();
  c.formatVerifiedOn = '21 Sep 2026';
  failsWith(c, 'ISO date');
});

test('a past formatVerifiedOn passes', () => {
  const c = good();
  c.formatVerifiedOn = '2026-09-19';
  assert.deepEqual(validateExamConfig(c).errors, []);
});

test('an unknown topic in sectionMix fails rather than being dropped', () => {
  const c = good();
  c.sectionMix['hand-signals'] = 0;
  failsWith(c, 'unknown topic');
});

test('a missing topic in sectionMix fails', () => {
  const c = good();
  delete c.sectionMix['road-signs'];
  failsWith(c, 'missing topic');
});

test('a typo in a top-level key fails instead of being silently ignored', () => {
  const c = good();
  c.negativeMarking = false; // the field name from the original brief
  failsWith(c, 'unknown key');
});

test('negative negativeMark fails', () => {
  const c = good();
  c.negativeMark = -1;
  failsWith(c, 'negativeMark');
});

test('a non-boolean allowBackNavigation fails', () => {
  const c = good();
  c.allowBackNavigation = 'false';
  failsWith(c, 'allowBackNavigation');
});

// --- the warning path ------------------------------------------------

test('a pass mark outside the 60-80% band warns but does not fail', () => {
  const c = good();
  c.passMark = 5; // 25%
  const { errors, warnings } = validateExamConfig(c);
  assert.deepEqual(errors, [], 'an unusual-but-legal pass mark must not block a build');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /60% and 80%/);
});

test('16/20 (the stricter reading of the AP bar) passes with no warning', () => {
  const c = good();
  c.passMark = 16;
  const { errors, warnings } = validateExamConfig(c);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('non-object input is rejected rather than throwing', () => {
  for (const bad of [null, 42, 'config', []]) {
    const { errors } = validateExamConfig(bad);
    assert.ok(errors.length > 0, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});
