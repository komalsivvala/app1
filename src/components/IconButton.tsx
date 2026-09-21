import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, touch } from '@/design/tokens';

export interface IconButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  onPress(): void;
  testID?: string;
}

/** 48×48 minimum. The label is mandatory: an icon alone is not a label. */
export function IconButton({ icon, accessibilityLabel, onPress, testID }: IconButtonProps) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID={testID}
    >
      <Ionicons name={icon} size={24} color={palette.text.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: touch.min, height: touch.min, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
