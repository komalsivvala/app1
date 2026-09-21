import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/design/theme';
import { layout, space } from '@/design/tokens';

export interface ScreenProps {
  children: ReactNode;
  /** Scroll by default; the exam session turns it off to keep the primary
   *  action pinned. */
  scroll?: boolean;
  testID?: string;
}

/** Page background, safe area, 20dp gutter, content max-width on tablets. */
export function Screen({ children, scroll = true, testID }: ScreenProps) {
  const { palette } = useTheme();
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]} edges={['top', 'left', 'right']} testID={testID}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.scroll}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: space.xxxl },
  inner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: space.md,
    gap: space.lg,
  },
});
