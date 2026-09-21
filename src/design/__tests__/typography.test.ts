import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TYPE_SCALE, LINE_HEIGHT, lineHeightFor, FONT_FAMILY, SCRIPT_FOR_LANG } from '../typography';
import type { Role } from '../typography';

const ROLES = Object.keys(TYPE_SCALE) as Role[];

test('type scale sizes are the spec\'s 32/24/20/17/13 set', () => {
  const sizes = new Set(ROLES.map((r) => TYPE_SCALE[r].size));
  assert.deepEqual([...sizes].sort((a, b) => b - a), [32, 24, 20, 17, 13]);
});

test('body and option text are never below 17', () => {
  assert.ok(TYPE_SCALE.body.size >= 17);
  assert.ok(TYPE_SCALE.option.size >= 17);
});

test('line-height table matches docs/03-UIUX-Design.md §2 exactly', () => {
  assert.deepEqual(LINE_HEIGHT, {
    display: { latin: 1.2, telugu: 1.45 },
    title: { latin: 1.3, telugu: 1.5 },
    heading: { latin: 1.35, telugu: 1.55 },
    question: { latin: 1.45, telugu: 1.65 },
    option: { latin: 1.45, telugu: 1.6 },
    body: { latin: 1.5, telugu: 1.65 },
    caption: { latin: 1.4, telugu: 1.55 },
  });
});

test('Telugu line height exceeds Latin for every role (stacked conjuncts)', () => {
  for (const r of ROLES) assert.ok(LINE_HEIGHT[r].telugu > LINE_HEIGHT[r].latin, r);
});

test('lineHeightFor: body latin 17 -> 26, body telugu 17 -> 28, question telugu 20 -> 33', () => {
  assert.equal(lineHeightFor('body', 'latin', 17), 26);
  assert.equal(lineHeightFor('body', 'telugu', 17), 28);
  assert.equal(lineHeightFor('question', 'telugu', 20), 33);
});

test('lineHeightFor is UNSCALED — React Native applies the OS text size to fontSize and lineHeight itself', () => {
  // Multiplying here as well would double-scale the line box on a device.
  for (const r of Object.keys(TYPE_SCALE) as (keyof typeof TYPE_SCALE)[]) {
    const size = TYPE_SCALE[r].size;
    assert.equal(lineHeightFor(r, 'latin', size), Math.round(size * LINE_HEIGHT[r].latin));
    assert.ok(lineHeightFor(r, 'telugu', size) > lineHeightFor(r, 'latin', size), `${r}: telugu needs the taller line box`);
  }
});

test('lineHeightFor refuses a non-positive size', () => {
  assert.throws(() => lineHeightFor('body', 'latin', 0), RangeError);
  assert.throws(() => lineHeightFor('body', 'latin', Number.NaN), RangeError);
});

test('every weight in the scale has a font family per script', () => {
  for (const r of ROLES) {
    const w = TYPE_SCALE[r].weight;
    assert.ok(FONT_FAMILY.latin[w]);
    assert.ok(FONT_FAMILY.telugu[w]);
  }
});

test('language -> script mapping', () => {
  assert.equal(SCRIPT_FOR_LANG.en, 'latin');
  assert.equal(SCRIPT_FOR_LANG.te, 'telugu');
});
