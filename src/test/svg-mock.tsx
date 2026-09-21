import { View } from 'react-native';

/** Jest stand-in for a transformed .svg import: an empty View carrying the props. */
export default function SvgMock(props: Record<string, unknown>) {
  return <View testID="svg" {...props} />;
}
