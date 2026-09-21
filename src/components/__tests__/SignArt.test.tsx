import { screen } from '@testing-library/react-native';

import { SignArt } from '@/components/SignArt';
import { SIGNS } from '@/content/questions';
import { isSignId } from '@/content/signs';
import { renderWithProviders } from '@/test/render';

test('renders a registered sign as an image labelled with its prose description', async () => {
  const stop = SIGNS.find((s) => s.id === 'mandatory-stop');
  expect(stop).toBeDefined();
  await renderWithProviders(<SignArt signId="mandatory-stop" alt={stop?.alt.en ?? ''} size={120} />);
  const img = screen.getByRole('image', { name: 'An octagonal red sign with the word STOP' });
  expect(img).toHaveStyle({ width: 120, height: 120 });
  expect(screen.getByTestId('svg')).toBeTruthy();
});

test('an id that is not in the registry renders nothing rather than crashing', async () => {
  await renderWithProviders(<SignArt signId="not-a-sign" alt="x" />);
  expect(screen.queryByRole('image')).toBeNull();
});

test('every shipped sign has a component in the registry', () => {
  for (const s of SIGNS) expect(isSignId(s.id)).toBe(true);
});
