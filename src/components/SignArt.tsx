import { StyleSheet, View } from 'react-native';

import { SIGN_ART, isSignId } from '@/content/signs';

export interface SignArtProps {
  signId: string;
  /** The prose description — announced to screen readers instead of the image. */
  alt: string;
  size?: number;
  testID?: string;
}

/** Renders a sign from the generated component registry. An unknown id
 *  cannot happen for shipped content (G-ASSET), but a dangling id after a
 *  content update renders nothing rather than crashing. */
export function SignArt({ signId, alt, size = 160, testID }: SignArtProps) {
  if (!isSignId(signId)) return null;
  const Art = SIGN_ART[signId];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={alt} style={[styles.box, { width: size, height: size }]} testID={testID ?? `sign-${signId}`}>
      <Art width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignSelf: 'center' } });
