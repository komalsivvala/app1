import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

import { AppText } from './AppText';
import { SignArt } from './SignArt';

export interface SignTileProps {
  signId: string;
  name: string;
  alt: string;
  accessibilityLabel: string;
  onPress(): void;
}

/** Square tile, SVG centred on surface, name below. Memoised: the grid
 *  re-renders on scroll and the SVG must not. */
export const SignTile = memo(function SignTile({ signId, name, alt, accessibilityLabel, onPress }: SignTileProps) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: palette.surface, borderColor: palette.border }, pressed && styles.pressed]}
      testID={`sign-tile-${signId}`}
    >
      <SignArt signId={signId} alt={alt} size={72} testID={`sign-tile-art-${signId}`} />
      <AppText variant="caption" align="center" numberOfLines={3} style={styles.name}>
        {name}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { flex: 1, margin: space.xs, padding: space.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: space.sm, minHeight: 150 },
  pressed: { opacity: 0.8 },
  name: { minHeight: 54 },
});
