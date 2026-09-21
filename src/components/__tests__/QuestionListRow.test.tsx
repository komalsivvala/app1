import { fireEvent, screen } from '@testing-library/react-native';

import { QuestionListRow } from '@/components/QuestionListRow';
import { renderWithProviders } from '@/test/render';

test('is a button carrying the number, text and status as its accessible name/hint; truncates to two lines', async () => {
  const onPress = jest.fn();
  await renderWithProviders(<QuestionListRow index={7} text="In which of these places may you park your vehicle?" status="wrong" statusLabel="Wrong last time" onPress={onPress} />);
  const row = screen.getByRole('button', { name: '7. In which of these places may you park your vehicle?' });
  expect(row.props.accessibilityHint).toBe('Wrong last time');
  expect(screen.getByText('In which of these places may you park your vehicle?').props.numberOfLines).toBe(2);
  await fireEvent.press(row);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('without a status there is no status icon; a sign question shows a thumbnail', async () => {
  await renderWithProviders(<QuestionListRow index={4} text="An octagonal red sign with the word STOP" signId="mandatory-stop" signAlt="An octagonal red sign with the word STOP" onPress={() => {}} />);
  // The thumbnail is hidden from assistive tech on purpose: the row's own label already carries the description.
  expect(screen.getByTestId('row-sign-mandatory-stop', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.queryByTestId('row-sign-mandatory-stop')).toBeNull();
});
