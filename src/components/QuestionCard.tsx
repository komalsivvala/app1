import { StyleSheet, View } from 'react-native';

import { space } from '@/design/tokens';

import { AppText } from './AppText';

/** Sign artwork slot (M4) above the question text. Never fixed height. */
export function QuestionCard({ text, testID }: { text: string; testID?: string }) {
  return (
    <View style={styles.card} testID={testID}>
      <AppText variant="question" accessibilityRole="header">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ card: { gap: space.md, paddingVertical: space.sm } });
