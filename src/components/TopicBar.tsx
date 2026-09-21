import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

import { AppText } from './AppText';

export function TopicBar({ label, valueLabel, fraction }: { label: string; valueLabel: string; fraction: number }) {
  const { palette } = useTheme();
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <View style={styles.block} accessibilityRole="progressbar" accessibilityLabel={`${label}: ${valueLabel}`} accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={styles.labels}>
        <AppText variant="caption" color="secondary">
          {label}
        </AppText>
        <AppText variant="caption">{valueLabel}</AppText>
      </View>
      <View style={[styles.track, { backgroundColor: palette.border }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: palette.accent.fill }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.xs },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  track: { height: 6, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
});
