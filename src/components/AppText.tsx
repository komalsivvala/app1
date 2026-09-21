import { Text, type TextProps } from 'react-native';

import { useTypography, type TextColor } from '@/design/use-typography';
import type { Role, Weight } from '@/design/typography';

export interface AppTextProps extends TextProps {
  /** Typographic role from the spec. Named `variant` because React Native's
   *  Text already owns `role` for the ARIA role. */
  variant?: Role;
  color?: TextColor;
  weight?: Weight;
  align?: 'left' | 'center' | 'right';
}

/** The only Text in the app. Role → size/weight/family/line-height from the
 *  spec; never a raw <Text> elsewhere, so no string can escape the scale. */
export function AppText({ variant = 'body', color = 'primary', weight, align, style, ...rest }: AppTextProps) {
  const { style: typo } = useTypography();
  const base = typo(variant, color, weight === undefined ? undefined : { weight });
  return <Text {...rest} style={[base, align !== undefined && { textAlign: align }, style]} />;
}
