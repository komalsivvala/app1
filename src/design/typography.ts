/**
 * Type scale and per-script line heights — docs/03-UIUX-Design.md §2 is the
 * single source of truth for these numbers; do not restate them elsewhere.
 *
 * This module is PURE (no react-native import) so the arithmetic can be unit
 * tested in plain Node. The one React Native fact it encodes is the reason it
 * exists: `fontSize` scales with the OS text-size setting but a NUMERIC
 * `lineHeight` does not. So every line height must be multiplied by the
 * device font scale, or at 200% text size the glyphs double while the line
 * box stays fixed — which is precisely the Telugu clipping the spec forbids.
 * text-style.ts injects `PixelRatio.getFontScale()`; tests inject numbers.
 */

export type Role = 'display' | 'title' | 'heading' | 'question' | 'option' | 'body' | 'caption';
export type Script = 'latin' | 'telugu';
export type Weight = '400' | '500' | '600';

export interface TypeSpec {
  readonly size: number;
  readonly weight: Weight;
}

/** Sizes 32/24/20/17/15/13. Body never below 17: read under exam pressure. */
export const TYPE_SCALE: Readonly<Record<Role, TypeSpec>> = {
  display: { size: 32, weight: '600' },
  title: { size: 24, weight: '600' },
  heading: { size: 20, weight: '600' },
  question: { size: 20, weight: '500' },
  option: { size: 17, weight: '400' },
  body: { size: 17, weight: '400' },
  caption: { size: 13, weight: '400' },
};

/** Telugu stacks conjuncts below the baseline and matras above it; at Latin
 *  metrics the glyphs clip and lines collide. Retained in full for v1.1 (PRD A1). */
export const LINE_HEIGHT: Readonly<Record<Role, Readonly<Record<Script, number>>>> = {
  display: { latin: 1.2, telugu: 1.45 },
  title: { latin: 1.3, telugu: 1.5 },
  heading: { latin: 1.35, telugu: 1.55 },
  question: { latin: 1.45, telugu: 1.65 },
  option: { latin: 1.45, telugu: 1.6 },
  body: { latin: 1.5, telugu: 1.65 },
  caption: { latin: 1.4, telugu: 1.55 },
};

/**
 * Line height in dp for a role/script at a given size and device font scale.
 * `fontScale` is REQUIRED, not defaulted: a caller that forgets it is the bug
 * this function exists to prevent, so the type system refuses it.
 */
export function lineHeightFor(role: Role, script: Script, size: number, fontScale: number): number {
  if (!(fontScale > 0)) throw new RangeError(`fontScale must be > 0, got ${fontScale}`);
  return Math.round(size * LINE_HEIGHT[role][script] * fontScale);
}

/** Font family per script. Only Inter is bundled in v1 (PRD A1). */
export const FONT_FAMILY: Readonly<Record<Script, Readonly<Record<Weight, string>>>> = {
  latin: { '400': 'Inter_400Regular', '500': 'Inter_500Medium', '600': 'Inter_600SemiBold' },
  telugu: {
    '400': 'NotoSansTelugu_400Regular',
    '500': 'NotoSansTelugu_500Medium',
    '600': 'NotoSansTelugu_600SemiBold',
  },
};

/** Which script a language renders in. Drives font family and line height. */
export const SCRIPT_FOR_LANG: Readonly<Record<'en' | 'te', Script>> = { en: 'latin', te: 'telugu' };
