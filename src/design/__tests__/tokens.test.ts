import { test } from 'node:test';
import assert from 'node:assert/strict';
import { light, dark, palettes, space, touch, radius, motion } from '../tokens';
import { contrastRatio, WCAG_AA_TEXT, WCAG_AAA_TEXT } from '../contrast';
import type { Palette } from '../tokens';

const r2 = (n: number) => Math.round(n * 100) / 100;

// The spec (docs/03-UIUX-Design.md §2) says "every pair below is measured, not
// estimated" and prints the ratios. Reproducing them here checks both the spec
// and this implementation of the WCAG formula at once.
const SPEC_RATIOS: Record<string, [string, string, number]> = {
  'light text.primary/bg':   [light.text.primary,   light.bg, 18.86],
  'light text.secondary/bg': [light.text.secondary, light.bg, 5.3],
  'light accent/bg':         [light.accent.fill,    light.bg, 5.61],
  'light success/bg':        [light.success.fill,   light.bg, 5.4],
  'light danger/bg':         [light.danger.fill,    light.bg, 5.63],
  'dark text.primary/bg':    [dark.text.primary,    dark.bg, 17.58],
  'dark text.secondary/bg':  [dark.text.secondary,  dark.bg, 7.03],
  'dark accent/bg':          [dark.accent.fill,     dark.bg, 5.73],
  'dark success/bg':         [dark.success.fill,    dark.bg, 7.96],
  'dark danger/bg':          [dark.danger.fill,     dark.bg, 6.53],
  'WHITE on dark accent (the documented failure)': ['#FFFFFF', dark.accent.fill, 3.43],
};

for (const [name, [fg, bg, expected]] of Object.entries(SPEC_RATIOS)) {
  test(`spec ratio reproduced: ${name} = ${expected}:1`, () => {
    assert.equal(r2(contrastRatio(fg, bg)), expected);
  });
}

function textOnBackgroundPairs(p: Palette): [string, string, string][] {
  return [
    ['text.primary on bg', p.text.primary, p.bg],
    ['text.secondary on bg', p.text.secondary, p.bg],
    ['text.primary on surface', p.text.primary, p.surface],
    ['text.secondary on surface', p.text.secondary, p.surface],
    ['accent on bg', p.accent.fill, p.bg],
    ['accent on surface', p.accent.fill, p.surface],
    ['success on bg', p.success.fill, p.bg],
    ['success on surface', p.success.fill, p.surface],
    ['danger on bg', p.danger.fill, p.bg],
    ['danger on surface', p.danger.fill, p.surface],
  ];
}

function onFillPairs(p: Palette): [string, string, string][] {
  return [
    ['accent.on on accent', p.accent.on, p.accent.fill],
    ['success.on on success', p.success.on, p.success.fill],
    ['danger.on on danger', p.danger.on, p.danger.fill],
  ];
}

for (const [scheme, p] of Object.entries(palettes)) {
  for (const [name, fg, bg] of textOnBackgroundPairs(p)) {
    test(`${scheme}: ${name} meets AA (>= ${WCAG_AA_TEXT}:1)`, () => {
      assert.ok(contrastRatio(fg, bg) >= WCAG_AA_TEXT, `${fg} on ${bg} = ${r2(contrastRatio(fg, bg))}`);
    });
  }
  // The set that is easy to skip and that shipped at 3.43:1 in the spec's first draft.
  for (const [name, fg, bg] of onFillPairs(p)) {
    test(`${scheme}: ${name} meets AA — on-fill pair (>= ${WCAG_AA_TEXT}:1)`, () => {
      assert.ok(contrastRatio(fg, bg) >= WCAG_AA_TEXT, `${fg} on ${bg} = ${r2(contrastRatio(fg, bg))}`);
    });
  }
  test(`${scheme}: primary text is AAA`, () => {
    assert.ok(contrastRatio(p.text.primary, p.bg) >= WCAG_AAA_TEXT);
  });
}

test('the on-fill check can actually fail: naive white-on-dark-accent is rejected', () => {
  assert.ok(contrastRatio('#FFFFFF', dark.accent.fill) < WCAG_AA_TEXT);
});

test('dark on-fill labels are dark, not white (designed, not inverted)', () => {
  assert.equal(dark.accent.on, dark.bg);
  assert.equal(dark.success.on, dark.bg);
  assert.equal(dark.danger.on, dark.bg);
});

test('spacing scale is 4-based and matches the spec', () => {
  assert.deepEqual([space.xs, space.sm, space.md, space.lg, space.xl, space.xxl, space.xxxl], [4, 8, 12, 16, 24, 32, 48]);
  assert.equal(space.gutter, 20);
});

test('tap targets: minimum 48, option rows and buttons 56', () => {
  assert.ok(touch.min >= 48);
  assert.equal(touch.optionRow, 56);
  assert.equal(touch.button, 56);
});

test('radius and motion match the spec', () => {
  assert.deepEqual(radius, { sm: 8, md: 12, lg: 16, full: 999 });
  assert.equal(motion.micro, 150);
  assert.equal(motion.transition, 220);
  assert.deepEqual([...motion.easing], [0.2, 0, 0, 1]);
});
