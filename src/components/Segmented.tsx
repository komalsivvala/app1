import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius, space, touch } from '@/design/tokens';

import { AppText } from './AppText';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  accessibilityLabel?: string;
}

export interface SegmentedProps<V extends string> {
  options: readonly SegmentedOption<V>[];
  value: V;
  onChange(value: V): void;
  accessibilityLabel: string;
}

/** Selected segment: 10% accent tint + accent outline — the same selection
 *  language as an exam option row, and never colour alone (the label also
 *  changes colour AND the state is exposed to assistive tech). */
export function Segmented<V extends string>({ options, value, onChange, accessibilityLabel }: SegmentedProps<V>) {
  const { palette } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[styles.group, { borderColor: palette.border }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={o.accessibilityLabel ?? o.label}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              selected && { backgroundColor: `${palette.accent.fill}1A`, borderColor: palette.accent.fill },
            ]}
          >
            <AppText variant="option" weight={selected ? '600' : '400'} color={selected ? 'accent' : 'primary'} align="center">
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', gap: space.sm },
  segment: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
});
