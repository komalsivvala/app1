import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ListStatus } from '@/db/stats';
import { useTheme } from '@/design/theme';
import { useTypography } from '@/design/use-typography';
import { space, touch } from '@/design/tokens';

import { AppText } from './AppText';
import { SignArt } from './SignArt';

export interface QuestionListRowProps {
  index: number;
  text: string;
  /** Omit to show no status icon (search results, sign-detail lists). */
  status?: ListStatus;
  statusLabel?: string;
  /** A sign question shows its artwork as a thumbnail — 68 rows reading
   *  "What does this sign mean?" would otherwise be indistinguishable. */
  signId?: string | null;
  signAlt?: string | null;
  onPress(): void;
  testID?: string;
}

const ICON: Record<ListStatus, ComponentProps<typeof Ionicons>['name']> = {
  mastered: 'checkmark-circle',
  wrong: 'alert-circle',
  unseen: 'ellipse-outline',
  seen: 'ellipse',
};

/** The ONE sanctioned truncation in the app: two lines, on word boundaries
 *  (the platform ellipsises whole grapheme clusters, so Telugu conjuncts are
 *  never split). Status carries an icon AND a label, never colour alone. */
export const QuestionListRow = memo(function QuestionListRow({ index, text, status, statusLabel, signId, signAlt, onPress, testID }: QuestionListRowProps) {
  const { palette } = useTheme();
  // Layout decision only: at large text a two-line clamp hides most of a stem.
  const { fontScale } = useTypography();
  const color = status === 'mastered' ? palette.success.fill : status === 'wrong' ? palette.danger.fill : palette.text.secondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${index}. ${text}`}
      accessibilityHint={statusLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: palette.border }, pressed && styles.pressed]}
      testID={testID}
    >
      <AppText variant="caption" color="secondary" style={styles.index}>
        {String(index)}
      </AppText>
      {signId != null && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <SignArt signId={signId} alt={signAlt ?? ''} size={40} testID={`row-sign-${signId}`} />
        </View>
      )}
      <AppText variant="body" numberOfLines={fontScale >= 1.5 ? 4 : 2} style={styles.text}>
        {text}
      </AppText>
      {status !== undefined && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Ionicons name={ICON[status]} size={22} color={color} />
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: touch.min + 8, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  index: { width: 28, textAlign: 'right' },
  text: { flex: 1 },
  pressed: { opacity: 0.7 },
});
