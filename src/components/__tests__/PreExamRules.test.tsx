import { screen } from '@testing-library/react-native';

import { PreExamRules } from '@/components/PreExamRules';
import type { ExamConfig } from '@/engine/exam-config';
import { renderWithProviders } from '@/test/render';

const base: ExamConfig = {
  questionCount: 20,
  passMark: 12,
  timing: { mode: 'per-question', secondsPerQuestion: 30, totalSeconds: null },
  allowBackNavigation: false,
  allowSkip: false,
  negativeMark: 0,
  sectionMix: { 'road-signs': 8, 'rules-of-road-regulations': 7, 'general-driving-principles': 5 },
  formatVerifiedOn: null,
};

test('states the rules straight from the config (R1: no code edit changes the exam)', async () => {
  await renderWithProviders(<PreExamRules config={base} />);
  const lines = screen.getAllByTestId('pre-exam-rule').map((n) => n.props.children);
  expect(lines).toEqual([
    '20 questions',
    '12 correct to pass',
    '30 seconds per question',
    'You cannot go back to a previous question.',
    "Wrong answers don't lose marks.",
  ]);
});

test('a changed config changes the screen: 15 questions, whole-paper, back allowed, negative marking', async () => {
  await renderWithProviders(
    <PreExamRules
      config={{
        ...base,
        questionCount: 15,
        passMark: 9,
        timing: { mode: 'whole-paper', secondsPerQuestion: null, totalSeconds: 600 },
        allowBackNavigation: true,
        negativeMark: 0.25,
      }}
    />,
  );
  const lines = screen.getAllByTestId('pre-exam-rule').map((n) => n.props.children);
  expect(lines).toEqual([
    '15 questions',
    '9 correct to pass',
    '10 minutes for the whole paper',
    'You can go back to a previous question.',
    'Each wrong answer loses 0.25 marks.',
  ]);
});

test('while formatVerifiedOn is null the screen says the format is unconfirmed — never a date it does not have', async () => {
  await renderWithProviders(<PreExamRules config={base} />);
  expect(screen.getByTestId('pre-exam-format').props.children).toBe(
    "This format hasn't been confirmed at an RTO yet — check locally.",
  );
});

test('once verified, the date is shown', async () => {
  await renderWithProviders(<PreExamRules config={{ ...base, formatVerifiedOn: '2026-10-05' }} />);
  expect(screen.getByTestId('pre-exam-format').props.children).toMatch(/^Format as of .*2026 — verify at your RTO\.$/);
});
