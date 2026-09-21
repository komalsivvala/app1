import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

import { AppText } from './AppText';

/** Used once: the non-affiliation disclaimer on About. Quiet by design. */
export function Banner({ text }: { text: string }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: palette.surface, borderColor: palette.border }]} accessibilityRole="text">
      <AppText variant="caption" color="secondary">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
});
