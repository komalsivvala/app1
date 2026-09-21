import { fireEvent, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { PrimaryButton } from '@/components/Button';
import { light } from '@/design/tokens';
import { renderWithProviders } from '@/test/render';

test('is a labelled, 56dp-tall button that fires onPress', async () => {
  const onPress = jest.fn();
  await renderWithProviders(<PrimaryButton label="Start Mock Test" onPress={onPress} />);
  const btn = screen.getByRole('button', { name: 'Start Mock Test' });
  await fireEvent.press(btn);
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(btn).toHaveStyle({ minHeight: 56, backgroundColor: light.accent.fill });
});

test('disabled state is exposed to assistive tech and blocks presses', async () => {
  const onPress = jest.fn();
  await renderWithProviders(<PrimaryButton label="Next" onPress={onPress} disabled />);
  const btn = screen.getByRole('button', { name: 'Next' });
  expect(btn).toBeDisabled();
  await fireEvent.press(btn);
  expect(onPress).not.toHaveBeenCalled();
});

test('the label uses the on-accent colour, the SemiBold family, and a line height scaled by the device font scale', async () => {
  await renderWithProviders(<PrimaryButton label="Go" onPress={() => {}} />);
  // option role: 17 × 1.45 (latin) × whatever font scale the test environment reports.
  const expectedLineHeight = Math.round(17 * 1.45 * Dimensions.get('window').fontScale);
  expect(screen.getByText('Go')).toHaveStyle({ color: light.accent.on, fontFamily: 'Inter_600SemiBold', lineHeight: expectedLineHeight });
});
