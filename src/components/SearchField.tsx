import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/design/theme';
import { FONT_FAMILY } from '@/design/typography';
import { useTypography } from '@/design/use-typography';
import { radius, space, touch } from '@/design/tokens';

export interface SearchFieldProps {
  value: string;
  onChangeText(value: string): void;
  placeholder: string;
  accessibilityLabel: string;
  autoFocus?: boolean;
  testID?: string;
}

export function SearchField({ value, onChangeText, placeholder, accessibilityLabel, autoFocus, testID }: SearchFieldProps) {
  const { palette } = useTheme();
  const { style } = useTypography();
  const text = style('body');
  return (
    <View style={[styles.box, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Ionicons name="search" size={20} color={palette.text.secondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.text.secondary}
        accessibilityLabel={accessibilityLabel}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={[styles.input, { color: palette.text.primary, fontFamily: FONT_FAMILY.latin['400'], fontSize: text.fontSize }]}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: touch.min + 4, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, paddingVertical: space.sm },
});
