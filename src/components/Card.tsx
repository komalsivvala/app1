import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, space, touch } from '@/design/tokens';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Required when pressable — screen readers announce this, not the children. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Surface fill + hairline border, radius 12. No shadow — separation comes
 *  from fill and border, never elevation used as ornament. */
export function Card({ children, onPress, accessibilityLabel, accessibilityHint, style, testID }: CardProps) {
  const { palette } = useTheme();
  const surface = [styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, style];
  if (onPress === undefined) {
    return (
      <View style={surface} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [surface, pressed && styles.pressed]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: touch.min,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: space.xs,
  },
  pressed: { opacity: 0.8 },
});
