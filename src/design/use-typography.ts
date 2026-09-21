import { useMemo } from 'react';
import { useWindowDimensions, type TextStyle } from 'react-native';

import { usePrefs } from '@/state/prefs';

import { useTheme } from './theme';
import { useWebTextScale } from './use-web-text-scale';
import type { Palette } from './tokens';
import {
  FONT_FAMILY,
  lineHeightFor,
  SCRIPT_FOR_LANG,
  TYPE_SCALE,
  type Role,
  type Script,
  type Weight,
} from './typography';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'danger'
  | 'onAccent'
  | 'onSuccess'
  | 'onDanger';

function colorOf(p: Palette, c: TextColor): string {
  switch (c) {
    case 'primary':
      return p.text.primary;
    case 'secondary':
      return p.text.secondary;
    case 'accent':
      return p.accent.fill;
    case 'success':
      return p.success.fill;
    case 'danger':
      return p.danger.fill;
    case 'onAccent':
      return p.accent.on;
    case 'onSuccess':
      return p.success.on;
    case 'onDanger':
      return p.danger.on;
  }
}

export interface TypographyApi {
  readonly script: Script;
  /** The effective text multiplier, for LAYOUT decisions only (e.g. a row
   *  that stacks at ≥ 1.5×). Live: useWindowDimensions re-renders when the
   *  user changes the OS text size. Never apply it to a font size yourself. */
  readonly fontScale: number;
  style(role: Role, color?: TextColor, opts?: { weight?: Weight; script?: Script }): TextStyle;
}

/**
 * Builds TextStyles from the spec's UNSCALED size and per-script line height.
 * React Native scales both by the OS text size (allowFontScaling), so the line
 * box grows with the glyphs without any arithmetic here. The web export has no
 * OS text size; there the stand-in multiplier is applied to both numbers so
 * the 200% screenshot matrix renders what a phone would. No fontWeight is set:
 * each weight is its own bundled family, and a synthetic bold on top of a real
 * SemiBold file is exactly how Android ends up with smeared text.
 */
export function useTypography(): TypographyApi {
  const { palette } = useTheme();
  const { language } = usePrefs();
  const { fontScale: osScale } = useWindowDimensions();
  const webScale = useWebTextScale();
  const script = SCRIPT_FOR_LANG[language];

  return useMemo<TypographyApi>(
    () => ({
      script,
      fontScale: osScale * webScale,
      style(role, color = 'primary', opts) {
        const { size, weight } = TYPE_SCALE[role];
        const s = opts?.script ?? script;
        const w = opts?.weight ?? weight;
        return {
          fontFamily: FONT_FAMILY[s][w],
          fontSize: size * webScale,
          lineHeight: lineHeightFor(role, s, size) * webScale,
          color: colorOf(palette, color),
        };
      },
    }),
    [palette, script, osScale, webScale],
  );
}
