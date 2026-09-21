import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { OptionRow, type OptionState } from '@/components/OptionRow';
import { QuestionCard } from '@/components/QuestionCard';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { localized, questionById } from '@/content';
import { CONTENT, QUESTIONS } from '@/content/questions';
import { allQuestionStats, applyEffects, createAttempt, loadAttempt } from '@/db/attempts';
import { useDb } from '@/db/provider';
import { hasCompletedMock } from '@/db/queries';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { PRACTICE_CONFIG } from '@/engine/practice-config';
import { createRng, newSeed } from '@/engine/rng';
import { samplePractice, type CandidateStats } from '@/engine/selection';
import { createSession, reduce, type Action, type OptionIndex, type SessionState } from '@/engine/session';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

type Phase = { kind: 'loading' } | { kind: 'no-mock' } | { kind: 'empty' } | { kind: 'running'; state: SessionState };

/**
 * Weak-area practice. The exam reducer, untimed, with IMMEDIATE feedback and
 * the explanation after every answer — the mock simulates, practice teaches
 * (docs/04-App-Flow.md §5). Persisted as a practice attempt: never touches
 * exam_seen / exam_correct, never feeds the readiness card.
 */
export default function PracticeSessionScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const db = useDb();
  const { palette } = useTheme();
  const { language } = usePrefs();
  const attemptId = useRef<number | null>(null);
  const stateRef = useRef<SessionState | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [revealed, setRevealed] = useState(false);

  const dispatch = useCallback(
    (action: Action) => {
      const current = stateRef.current;
      const id = attemptId.current;
      if (current === null || id === null) return;
      const step = reduce(current, action);
      if (step.state === current && step.effects.length === 0) return;
      stateRef.current = step.state;
      setPhase({ kind: 'running', state: step.state });
      queue.current = queue.current.then(() => applyEffects(db, id, step.effects, step.state.config));
      if (step.state.phase === 'complete') {
        queue.current = queue.current.then(() => router.replace({ pathname: '/practice/summary', params: { attemptId: String(id) } }));
      }
    },
    [db, router],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await hasCompletedMock(db))) {
        if (!cancelled) setPhase({ kind: 'no-mock' });
        return;
      }
      const stats = new Map<string, CandidateStats>(
        (await allQuestionStats(db)).map((r) => [r.question_id, { examSeen: r.exam_seen, examCorrect: r.exam_correct, lastResult: r.last_result }]),
      );
      const seed = newSeed();
      const picked = samplePractice(QUESTIONS.map((q) => ({ id: q.id, topic: q.topic })), stats, createRng(seed));
      if (picked.length === 0) {
        if (!cancelled) setPhase({ kind: 'empty' });
        return;
      }
      const paper = picked.map((c) => {
        const q = questionById(c.id);
        if (q === undefined) throw new Error(`sampled question ${c.id} missing from bundle`);
        return { questionId: q.id, topic: q.topic, correctIndex: q.answerIndex };
      });
      const startedAt = Date.now();
      const id = await createAttempt(db, { mode: 'practice', language, paper, config: PRACTICE_CONFIG, contentVersion: CONTENT.contentVersion, seed, startedAt });
      const created = await loadAttempt(db, id);
      if (created === null || cancelled) return;
      attemptId.current = id;
      const initial = createSession(created.paper, PRACTICE_CONFIG, startedAt);
      stateRef.current = initial;
      setPhase({ kind: 'running', state: initial });
      dispatch({ type: 'present', at: Date.now() });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount
  }, []);

  // Leaving a practice set abandons it quietly — it is a drill, not a paper.
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', () => {
      const s = stateRef.current;
      if (s !== null && s.phase === 'running') dispatch({ type: 'abandon' });
    });
    return sub;
  }, [navigation, dispatch]);

  if (phase.kind === 'loading') {
    return (
      <Screen testID="practice-loading">
        <AppText color="secondary">{t('practice.preparing')}</AppText>
      </Screen>
    );
  }
  if (phase.kind === 'no-mock' || phase.kind === 'empty') {
    return (
      <Screen testID={phase.kind === 'empty' ? 'practice-empty' : 'practice-no-mock'}>
        <ScreenHeader title={t('practice.title')} back />
        <Card>
          <AppText variant="heading">{phase.kind === 'empty' ? t('practice.empty.title') : t('practice.title')}</AppText>
          <AppText color="secondary">{phase.kind === 'empty' ? t('practice.empty.body') : t('practice.empty.noMock')}</AppText>
        </Card>
        <Button.Secondary label={t('practice.empty.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const { state } = phase;
  const item = state.paper[state.position];
  const question = item === undefined ? undefined : questionById(item.questionId);
  const total = state.paper.length;
  const isLast = state.position === total - 1;
  const chosen = state.pendingSelection;

  const stateFor = (i: number): OptionState => {
    if (!revealed || question === undefined) return chosen === i ? 'selected' : 'default';
    const isCorrect = i === question.answerIndex;
    if (isCorrect) return chosen === i ? 'correct' : 'correctNotChosen';
    return chosen === i ? 'incorrect' : 'default';
  };

  return (
    <Screen testID="practice-session">
      <ScreenHeader title={t('practice.title')} back right={<AppText variant="caption" color="secondary" testID="practice-progress">{t('practice.progress', { current: state.position + 1, total })}</AppText>} />
      {question === undefined ? (
        <AppText color="danger">{t('question.missing')}</AppText>
      ) : (
        <>
          <QuestionCard text={localized(question.text, language)} signId={question.signId} signAlt={question.signAlt === null ? null : localized(question.signAlt, language)} />
          <View style={styles.options}>
            {question.options.map((opt, i) => (
              <OptionRow
                key={i}
                index={i}
                total={4}
                text={localized(opt, language)}
                state={stateFor(i)}
                disabled={revealed}
                onPress={() => {
                  dispatch({ type: 'select', index: i as OptionIndex });
                  setRevealed(true);
                }}
                testID={`practice-option-${i}`}
              />
            ))}
          </View>
          {revealed && chosen !== null && (
            <View style={[styles.feedback, { backgroundColor: palette.surface, borderColor: palette.border }]} testID="practice-feedback">
              <View style={styles.verdict}>
                <Ionicons name={chosen === question.answerIndex ? 'checkmark-circle' : 'close-circle'} size={22} color={chosen === question.answerIndex ? palette.success.fill : palette.danger.fill} />
                <AppText color={chosen === question.answerIndex ? 'success' : 'danger'}>{chosen === question.answerIndex ? t('practice.correct') : t('practice.incorrect')}</AppText>
              </View>
              <AppText variant="caption" color="secondary">
                {t('practice.why')}
              </AppText>
              <AppText>{localized(question.explanation, language)}</AppText>
            </View>
          )}
        </>
      )}
      <Button.Primary
        label={isLast ? t('practice.finish') : t('practice.next')}
        disabled={!revealed}
        onPress={() => {
          setRevealed(false);
          dispatch({ type: 'next', at: Date.now() });
        }}
        testID="practice-next"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: space.sm },
  feedback: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.xs },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
