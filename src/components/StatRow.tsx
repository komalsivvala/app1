import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';
import { space, touch } from '@/design/tokens';

import { AppText } from './AppText';

export function StatRow({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: palette.border }]} accessibilityRole="text" accessibilityLabel={`${label}: ${value}`}>
      <AppText color="secondary" style={styles.label}>
        {label}
      </AppText>
      <AppText style={styles.value} align="right">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { flexShrink: 1 },
  value: { flexShrink: 1 },
});
