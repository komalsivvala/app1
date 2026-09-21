import { fireEvent, screen } from '@testing-library/react-native';

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

test('the label uses the on-accent colour, the SemiBold family, and the UNSCALED option line height', async () => {
  await renderWithProviders(<PrimaryButton label="Go" onPress={() => {}} />);
  // option role: 17 × 1.45 (latin) = 25. Never multiplied by the device font
  // scale in JS: React Native scales fontSize and lineHeight itself
  // (docs/03-UIUX-Design.md §2, M6 correction). The Jest environment reports
  // a font scale of 2 — which is exactly why the old, scaled assertion read 49.
  expect(screen.getByText('Go')).toHaveStyle({ color: light.accent.on, fontFamily: 'Inter_600SemiBold', lineHeight: 25 });
});
