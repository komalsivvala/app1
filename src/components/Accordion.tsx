import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, space, touch } from '@/design/tokens';

import { AppText } from './AppText';

export interface AccordionProps {
  title: string;
  expandLabel: string;
  collapseLabel: string;
  children: ReactNode;
  initiallyOpen?: boolean;
  testID?: string;
}

/** One section of the guide. The header is a 48dp button that exposes its
 *  expanded state; nothing animates (reduce-motion safe by construction). */
export function Accordion({ title, expandLabel, collapseLabel, children, initiallyOpen = false, testID }: AccordionProps) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={[styles.box, { backgroundColor: palette.surface, borderColor: palette.border }]} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? collapseLabel : expandLabel}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        testID={testID === undefined ? undefined : `${testID}-toggle`}
      >
        <AppText variant="heading" style={styles.title}>
          {title}
        </AppText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={palette.text.secondary} />
      </Pressable>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  header: { minHeight: touch.button, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  pressed: { opacity: 0.8 },
  title: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
});
