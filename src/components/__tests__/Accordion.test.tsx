import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Accordion } from '@/components/Accordion';
import { renderWithProviders } from '@/test/render';

const FEE = '₹150 per class of vehicle';
const AGE = '18 years';

test('a collapsed section hides its body and exposes expanded=false; tapping the 48dp header reveals it', async () => {
  await renderWithProviders(
    <Accordion title="Fees" expandLabel="Expand Fees" collapseLabel="Collapse Fees">
      <Text>{FEE}</Text>
    </Accordion>,
  );
  const header = screen.getByRole('button', { name: 'Expand Fees' });
  expect(header).not.toBeExpanded();
  expect(screen.queryByText(FEE)).toBeNull();
  await fireEvent.press(header);
  expect(screen.getByText(FEE)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Collapse Fees' })).toBeExpanded();
});

test('initiallyOpen renders the body at once', async () => {
  await renderWithProviders(
    <Accordion title="Who can apply" expandLabel="Expand" collapseLabel="Collapse" initiallyOpen>
      <Text>{AGE}</Text>
    </Accordion>,
  );
  expect(screen.getByText(AGE)).toBeTruthy();
});
