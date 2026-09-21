import { useMemo } from 'react';
import { useWindowDimensions, type TextStyle } from 'react-native';

import { usePrefs } from '@/state/prefs';

import { useTheme } from './theme';
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
  readonly fontScale: number;
  style(role: Role, color?: TextColor, opts?: { weight?: Weight; script?: Script }): TextStyle;
}

/**
 * Builds TextStyles with the per-script line height multiplied by the LIVE
 * device font scale (useWindowDimensions re-renders when the user changes
 * text size), so the line box grows with the glyphs. No fontWeight is set:
 * each weight is its own bundled family, and a synthetic bold on top of a
 * real SemiBold file is exactly how Android ends up with smeared text.
 */
export function useTypography(): TypographyApi {
  const { palette } = useTheme();
  const { language } = usePrefs();
  const { fontScale } = useWindowDimensions();
  const script = SCRIPT_FOR_LANG[language];

  return useMemo<TypographyApi>(
    () => ({
      script,
      fontScale,
      style(role, color = 'primary', opts) {
        const { size, weight } = TYPE_SCALE[role];
        const s = opts?.script ?? script;
        const w = opts?.weight ?? weight;
        return {
          fontFamily: FONT_FAMILY[s][w],
          fontSize: size,
          lineHeight: lineHeightFor(role, s, size, fontScale),
          color: colorOf(palette, color),
        };
      },
    }),
    [palette, script, fontScale],
  );
}
