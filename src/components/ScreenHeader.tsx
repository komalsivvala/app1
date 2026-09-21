import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';
import { space, touch } from '@/design/tokens';
import { useI18n } from '@/i18n/use-i18n';

import { AppText } from './AppText';

export interface ScreenHeaderProps {
  title: string;
  /** Show a back affordance (pushed screens and modals). Never on the exam session. */
  back?: boolean;
  right?: ReactNode;
}

/** Drawn in-screen rather than by the navigator so every platform — including
 *  the web screenshot target — renders the identical, themed header. */
export function ScreenHeader({ title, back = false, right }: ScreenHeaderProps) {
  const { palette } = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={28} color={palette.text.primary} />
        </Pressable>
      )}
      <AppText variant="title" style={styles.title} accessibilityRole="header">
        {title}
      </AppText>
      {right !== undefined && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch.min },
  iconButton: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center', marginLeft: -space.md },
  pressed: { opacity: 0.6 },
  title: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
