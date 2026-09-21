// Tests for gate G-LANG. Run: node --test "scripts/**/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateContentConfig } from '../validate-content-config.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHIPPED = resolve(HERE, '../../src/content/content-config.json');

const good = () => ({
  contentVersion: '2026.09.1',
  languages: ['en'],
  defaultLanguage: 'en',
  plannedLanguages: ['te'],
  decision: { date: '2026-09-21', summary: 's', reason: 'r', reversal: 'v' },
});
const failsWith = (c, needle) => {
  const { errors } = validateContentConfig(c);
  assert.ok(errors.length > 0, 'expected an error');
  assert.ok(errors.some((e) => e.toLowerCase().includes(needle.toLowerCase())),
    `expected "${needle}" in:\n  ${errors.join('\n  ')}`);
};

test('the shipped content-config passes', () => {
  assert.deepEqual(validateContentConfig(JSON.parse(readFileSync(SHIPPED, 'utf8'))).errors, []);
});
test('the shipped config is English-only with Telugu planned (PRD amendment A1)', () => {
  const c = JSON.parse(readFileSync(SHIPPED, 'utf8'));
  assert.deepEqual(c.languages, ['en']);
  assert.deepEqual(c.plannedLanguages, ['te']);
  assert.ok(c.decision.reason.length > 20, 'a language cut must say why');
});
test('a known-good config passes', () => assert.deepEqual(validateContentConfig(good()).errors, []));
test('bilingual config is also valid', () => {
  const c = good(); c.languages = ['en', 'te']; c.plannedLanguages = [];
  assert.deepEqual(validateContentConfig(c).errors, []);
});
test('defaultLanguage not in languages fails — app would default to missing content', () => {
  const c = good(); c.defaultLanguage = 'te'; failsWith(c, 'not in languages');
});
test('a language both shipped and planned fails', () => {
  const c = good(); c.plannedLanguages = ['en']; failsWith(c, 'both shipped and planned');
});
test('empty languages fails', () => { const c = good(); c.languages = []; failsWith(c, 'non-empty'); });
test('unknown language fails', () => { const c = good(); c.languages = ['en', 'hi']; failsWith(c, 'unknown "hi"'); });
test('duplicate languages fail', () => { const c = good(); c.languages = ['en', 'en']; failsWith(c, 'duplicates'); });
test('missing decision block fails', () => { const c = good(); delete c.decision; failsWith(c, 'decision'); });
test('empty decision.reason fails', () => { const c = good(); c.decision.reason = '  '; failsWith(c, 'decision.reason'); });
test('malformed decision.date fails', () => { const c = good(); c.decision.date = 'Sep 21'; failsWith(c, 'YYYY-MM-DD'); });
test('unknown top-level key fails', () => { const c = good(); c.locales = ['en']; failsWith(c, 'unknown key'); });
test('missing contentVersion fails', () => { const c = good(); delete c.contentVersion; failsWith(c, 'contentVersion'); });
test('clock-shaped contentVersion fails', () => { const c = good(); c.contentVersion = '2026-09-21T05:22:28Z'; failsWith(c, 'YYYY.MM.N'); });
test('non-object input is rejected', () => {
  for (const bad of [null, 1, 'x', []]) assert.ok(validateContentConfig(bad).errors.length > 0);
});
