import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

import { AppText } from './AppText';
import { Card } from './Card';

export interface TopicCardProps {
  title: string;
  subtitle: string;
  /** 0–100, or null before any completed mock — then no bar is drawn. */
  accuracyPct: number | null;
  onPress?: () => void;
}

export function TopicCard({ title, subtitle, accuracyPct, onPress }: TopicCardProps) {
  const { palette } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={`${title}. ${subtitle}`}>
      <AppText variant="heading">{title}</AppText>
      <AppText variant="caption" color="secondary">
        {subtitle}
      </AppText>
      {accuracyPct !== null && (
        <View
          style={[styles.track, { backgroundColor: palette.border }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: accuracyPct }}
        >
          <View style={[styles.fill, { width: `${accuracyPct}%`, backgroundColor: palette.accent.fill }]} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: radius.full, marginTop: space.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
});
