/**
 * Type scale and per-script line heights — docs/03-UIUX-Design.md §2 is the
 * single source of truth for these numbers; do not restate them elsewhere.
 *
 * This module is PURE (no react-native import) so the arithmetic can be unit
 * tested in plain Node.
 *
 * Every value here is UNSCALED. React Native applies the OS text-size
 * multiplier to `fontSize` AND to a numeric `lineHeight` itself when
 * allowFontScaling is on (the default): Android's TextAttributeProps converts
 * lineHeight with toPixelFromSP, iOS multiplies it by the font-size multiplier
 * in RCTAttributedTextUtils. Multiplying in JS as well would double-scale the
 * line box — at 200% text size the glyphs double and the lines quadruple.
 * The web export has no OS text size at all, so use-web-text-scale supplies a
 * stand-in multiplier there (used by the 200% screenshot matrix); on native
 * that multiplier is always 1.
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
 * Unscaled line height in dp for a role/script at a given size. Never multiply
 * this by the device font scale on native — React Native does that itself.
 */
export function lineHeightFor(role: Role, script: Script, size: number): number {
  if (!(size > 0)) throw new RangeError(`size must be > 0, got ${size}`);
  return Math.round(size * LINE_HEIGHT[role][script]);
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
