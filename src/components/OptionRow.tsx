import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, space, touch } from '@/design/tokens';
import { useI18n } from '@/i18n/use-i18n';

import { AppText } from './AppText';

/** default / selected during the exam; the other three only in review. */
export type OptionState = 'default' | 'selected' | 'correct' | 'incorrect' | 'correctNotChosen';

export interface OptionRowProps {
  text: string;
  index: number;
  total: number;
  state: OptionState;
  onPress?: () => void;
  disabled?: boolean;
  stateLabel?: string;
  testID?: string;
}

const ICON: Record<Exclude<OptionState, 'default'>, ComponentProps<typeof Ionicons>['name']> = {
  selected: 'radio-button-on',
  correct: 'checkmark-circle',
  incorrect: 'close-circle',
  correctNotChosen: 'checkmark-circle-outline',
};

/** Full-width, min-height 56, radius 12, surface fill. Every state carries an
 *  icon AND a colour — never colour alone. Selection during the exam is a 10%
 *  accent tint + accent outline, with NO correctness feedback. */
export function OptionRow({ text, index, total, state, onPress, disabled, stateLabel, testID }: OptionRowProps) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const tint =
    state === 'selected' ? palette.accent.fill : state === 'correct' || state === 'correctNotChosen' ? palette.success.fill : state === 'incorrect' ? palette.danger.fill : null;
  // Screen readers hear "Option 2 of 4: Give way, selected" — docs/03-UIUX-Design.md §5.
  const label = `${t('exam.option', { n: index + 1, total, text })}${stateLabel !== undefined ? `, ${stateLabel}` : ''}`;
  return (
    <Pressable
      accessibilityRole={onPress === undefined ? 'text' : 'radio'}
      accessibilityLabel={label}
      accessibilityState={{ selected: state === 'selected', disabled: disabled === true }}
      onPress={onPress}
      disabled={disabled || onPress === undefined}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: tint === null ? palette.surface : `${tint}1A`, borderColor: tint ?? palette.border },
        pressed && onPress !== undefined && styles.pressed,
      ]}
    >
      <View style={styles.badge}>
        {state === 'default' ? (
          <AppText variant="caption" color="secondary">
            {String.fromCharCode(65 + index)}
          </AppText>
        ) : (
          <Ionicons name={ICON[state]} size={24} color={tint ?? palette.text.primary} />
        )}
      </View>
      <AppText variant="option" style={styles.text}>
        {text}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.optionRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  badge: { width: 28, alignItems: 'center' },
  text: { flex: 1 },
  pressed: { opacity: 0.8 },
});
