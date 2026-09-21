import { fireEvent, screen } from '@testing-library/react-native';

import { OptionRow } from '@/components/OptionRow';
import { light } from '@/design/tokens';
import { renderWithProviders } from '@/test/render';

test('default state: letter badge, surface fill, tappable radio', async () => {
  const onPress = jest.fn();
  await renderWithProviders(<OptionRow index={1} total={4} text="Give way" state="default" onPress={onPress} />);
  const row = screen.getByRole('radio', { name: 'Option 2 of 4: Give way' });
  expect(screen.getByText('B')).toBeTruthy();
  expect(row).toHaveStyle({ backgroundColor: light.surface, minHeight: 56 });
  await fireEvent.press(row);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('selected: 10% accent tint + accent outline, state exposed to assistive tech, NO correctness feedback', async () => {
  await renderWithProviders(<OptionRow index={0} total={4} text="Stop" state="selected" stateLabel="selected" onPress={() => {}} />);
  const row = screen.getByRole('radio', { name: 'Option 1 of 4: Stop, selected' });
  expect(row).toHaveStyle({ backgroundColor: `${light.accent.fill}1A`, borderColor: light.accent.fill });
  expect(row).toBeSelected();
});

test('review states carry colour AND a label — never colour alone', async () => {
  await renderWithProviders(
    <>
      <OptionRow index={0} total={4} text="A" state="correct" stateLabel="Correct answer" />
      <OptionRow index={1} total={4} text="B" state="incorrect" stateLabel="Your answer" />
      <OptionRow index={2} total={4} text="C" state="correctNotChosen" stateLabel="Correct answer" />
    </>,
  );
  expect(screen.getByLabelText('Option 1 of 4: A, Correct answer')).toHaveStyle({ borderColor: light.success.fill });
  expect(screen.getByLabelText('Option 2 of 4: B, Your answer')).toHaveStyle({ borderColor: light.danger.fill });
  expect(screen.getByLabelText('Option 3 of 4: C, Correct answer')).toHaveStyle({ borderColor: light.success.fill });
});
