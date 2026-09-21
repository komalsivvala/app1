import { act, screen } from '@testing-library/react-native';

import { ExamTimer } from '@/components/ExamTimer';
import { light } from '@/design/tokens';
import { renderWithProviders } from '@/test/render';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('counts down from the wall-clock deadline, turns the bar to danger at the final 20%, fires onExpire exactly once', async () => {
  let t = 0;
  const now = () => t;
  const onExpire = jest.fn();
  await renderWithProviders(<ExamTimer deadline={10_000} totalMs={10_000} now={now} onExpire={onExpire} />);
  expect(screen.getByTestId('exam-timer-readout').props.children).toBe('0:10');
  expect(screen.getByTestId('exam-timer-bar')).toHaveStyle({ backgroundColor: light.accent.fill });

  t = 8_500; // 15% left
  await act(async () => {
    jest.advanceTimersByTime(250);
  });
  expect(screen.getByTestId('exam-timer-readout').props.children).toBe('0:02');
  expect(screen.getByTestId('exam-timer-bar')).toHaveStyle({ backgroundColor: light.danger.fill });
  expect(onExpire).not.toHaveBeenCalled();

  t = 10_000;
  await act(async () => {
    jest.advanceTimersByTime(250);
  });
  expect(onExpire).toHaveBeenCalledTimes(1);
  await act(async () => {
    jest.advanceTimersByTime(2_000);
  });
  expect(onExpire).toHaveBeenCalledTimes(1);
});

test('remaining time is recomputed from the clock, never accumulated from ticks', async () => {
  let t = 0;
  const onExpire = jest.fn();
  await renderWithProviders(<ExamTimer deadline={30_000} totalMs={30_000} now={() => t} onExpire={onExpire} />);
  // A single 250 ms tick while the clock jumps 20 s (backgrounding).
  t = 20_000;
  await act(async () => {
    jest.advanceTimersByTime(250);
  });
  expect(screen.getByTestId('exam-timer-readout').props.children).toBe('0:10');
});

test('the 250 ms tick re-renders the timer leaf only — the parent (the exam screen) does not render again', async () => {
  let t = 0;
  const now = () => t;
  const parentRenders = jest.fn();
  function Parent() {
    parentRenders();
    return <ExamTimer deadline={30_000} totalMs={30_000} now={now} onExpire={() => {}} />;
  }
  await renderWithProviders(<Parent />);
  const before = parentRenders.mock.calls.length;
  for (let i = 0; i < 8; i++) {
    t += 250;
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
  }
  expect(screen.getByTestId('exam-timer-readout').props.children).toBe('0:28');
  expect(parentRenders.mock.calls.length).toBe(before);
});
