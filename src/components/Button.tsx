import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, space, touch } from '@/design/tokens';

import { AppText } from './AppText';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
}

/** Exactly one per screen. Height 56, accent fill, accent.on label. */
export function PrimaryButton({ label, disabled, ...rest }: ButtonProps) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.accent.fill, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
      ]}
    >
      <AppText variant="option" weight="600" color="onAccent" align="center">
        {label}
      </AppText>
    </Pressable>
  );
}

/** Same geometry, transparent fill, hairline outline. */
export function SecondaryButton({ label, disabled, ...rest }: ButtonProps) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        styles.outlined,
        { borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <AppText variant="option" weight="600" align="center">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.button,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlined: { backgroundColor: 'transparent', borderWidth: 1 },
});

export const Button = { Primary: PrimaryButton, Secondary: SecondaryButton } as const;
