import { StyleSheet, View } from 'react-native';

import { space } from '@/design/tokens';

import { AppText } from './AppText';
import { SignArt } from './SignArt';

export interface QuestionCardProps {
  text: string;
  signId?: string | null;
  signAlt?: string | null;
  testID?: string;
}

/** Sign artwork (max 200, contained) above the question text. Never fixed height. */
export function QuestionCard({ text, signId, signAlt, testID }: QuestionCardProps) {
  return (
    <View style={styles.card} testID={testID}>
      {signId != null && <SignArt signId={signId} alt={signAlt ?? ''} size={200} />}
      <AppText variant="question" accessibilityRole="header">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ card: { gap: space.md, paddingVertical: space.sm } });
