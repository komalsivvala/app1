import { useNavigation, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ExamTimer } from '@/components/ExamTimer';
import { OptionRow } from '@/components/OptionRow';
import { QuestionCard } from '@/components/QuestionCard';
import { Screen } from '@/components/Screen';
import { localized, questionById } from '@/content';
import { CONTENT, QUESTIONS } from '@/content/questions';
import { allQuestionStats, applyEffects, createAttempt, loadAttempt } from '@/db/attempts';
import { useDb } from '@/db/provider';
import { space } from '@/design/tokens';
import { createClock } from '@/engine/clock';
import { EXAM_CONFIG } from '@/engine/exam-config';
import { createRng, newSeed } from '@/engine/rng';
import { samplePaper, type CandidateStats } from '@/engine/selection';
import { createSession, currentDeadline, reduce, timerTotalMs, type Action, type OptionIndex, type SessionState } from '@/engine/session';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

/**
 * The exam screen. State lives in the pure reducer; every effect it emits is
 * persisted before the next action runs, so a kill at any point resumes from
 * the database. No tab bar, no header, no back gesture (see _layout.tsx); the
 * only way out is the confirm dialog wired to beforeRemove.
 */
export default function ExamSessionScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const db = useDb();
  const { language } = usePrefs();
  const params = useLocalSearchParams<{ attemptId?: string }>();

  const clock = useMemo(() => createClock(), []);
  const now = useCallback(() => clock.now(), [clock]);
  const attemptId = useRef<number | null>(null);
  const stateRef = useRef<SessionState | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [state, setState] = useState<SessionState | null>(null);

  const dispatch = useCallback(
    (action: Action) => {
      const current = stateRef.current;
      const id = attemptId.current;
      if (current === null || id === null) return;
      const step = reduce(current, action);
      if (step.state === current && step.effects.length === 0) return;
      stateRef.current = step.state;
      setState(step.state);
      if (clock.unreliable && step.state.timingReliable) {
        const flag = reduce(step.state, { type: 'clockUnreliable' });
        stateRef.current = flag.state;
        setState(flag.state);
        queue.current = queue.current.then(() => applyEffects(db, id, flag.effects, flag.state.config));
      }
      queue.current = queue.current.then(() => applyEffects(db, id, step.effects, step.state.config));
      if (step.state.phase === 'complete') {
        queue.current = queue.current.then(() => router.replace({ pathname: '/exam/result', params: { attemptId: String(id) } }));
      }
    },
    [clock, db, router],
  );

  // Create or resume the attempt, then present the first live question.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const startedAt = now();
      let id: number;
      let initial: SessionState;
      const resumeId = params.attemptId !== undefined ? Number(params.attemptId) : null;
      const loaded = resumeId !== null && Number.isFinite(resumeId) ? await loadAttempt(db, resumeId) : null;
      if (loaded !== null && loaded.attempt.status === 'in_progress') {
        id = loaded.attempt.id;
        initial = createSession(loaded.paper, loaded.config, loaded.attempt.started_at);
      } else {
        const stats = new Map<string, CandidateStats>(
          (await allQuestionStats(db)).map((r) => [r.question_id, { examSeen: r.exam_seen, examCorrect: r.exam_correct, lastResult: r.last_result }]),
        );
        const seed = newSeed();
        const picked = samplePaper(QUESTIONS.map((q) => ({ id: q.id, topic: q.topic })), stats, EXAM_CONFIG, createRng(seed));
        const paper = picked.map((c) => {
          const q = questionById(c.id);
          if (q === undefined) throw new Error(`sampled question ${c.id} missing from bundle`);
          return { questionId: q.id, topic: q.topic, correctIndex: q.answerIndex };
        });
        id = await createAttempt(db, { mode: 'mock', language, paper, config: EXAM_CONFIG, contentVersion: CONTENT.contentVersion, seed, startedAt });
        const created = await loadAttempt(db, id);
        if (created === null) throw new Error('attempt vanished after creation');
        initial = createSession(created.paper, EXAM_CONFIG, startedAt);
      }
      if (cancelled) return;
      attemptId.current = id;
      stateRef.current = initial;
      setState(initial);
      // Resume reconciles time away; present starts the clock on a fresh paper.
      dispatch({ type: 'resume', at: now() });
      dispatch({ type: 'present', at: now() });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount
  }, []);

  // Backgrounding: recompute from the wall clock on return, never from ticks.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') dispatch({ type: 'resume', at: now() });
    });
    return () => sub.remove();
  }, [dispatch, now]);

  // Forward-only: any attempt to leave (hardware back, gesture, header) is
  // intercepted and confirmed. Discard abandons the attempt; Stay does nothing.
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      const s = stateRef.current;
      if (s === null || s.phase !== 'running') return;
      e.preventDefault();
      Alert.alert(t('exam.exit.title'), t('exam.exit.body'), [
        { text: t('exam.exit.stay'), style: 'cancel' },
        {
          text: t('exam.exit.discard'),
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'abandon' });
            queue.current = queue.current.then(() => navigation.dispatch(e.data.action));
          },
        },
      ]);
    });
    return sub;
  }, [navigation, dispatch, t]);

  const onExpire = useCallback(() => dispatch({ type: 'expire', at: now() }), [dispatch, now]);

  if (state === null || state.phase !== 'running') {
    return (
      <Screen scroll={false} testID="exam-session-loading">
        <AppText color="secondary">{t('exam.loading')}</AppText>
      </Screen>
    );
  }

  const item = state.paper[state.position];
  const question = item === undefined ? undefined : questionById(item.questionId);
  const deadline = currentDeadline(state);
  const total = state.paper.length;
  const isLast = state.position === total - 1;
  const canSubmit = state.pendingSelection !== null || state.config.allowSkip;

  return (
    <Screen scroll={false} testID="exam-session">
      {deadline !== null && <ExamTimer key={`${state.position}-${deadline}`} deadline={deadline} totalMs={timerTotalMs(state)} now={now} onExpire={onExpire} />}
      <AppText variant="caption" color="secondary" accessibilityLabel={t('exam.progressA11y', { current: state.position + 1, total })} testID="exam-progress">
        {t('exam.progress', { current: state.position + 1, total })}
      </AppText>

      {question === undefined ? (
        <AppText color="danger">{t('review.missingQuestion')}</AppText>
      ) : (
        <>
          <QuestionCard text={localized(question.text, language)} signId={question.signId} signAlt={question.signAlt === null ? null : localized(question.signAlt, language)} testID="exam-question" />
          <View style={styles.options}>
            {question.options.map((opt, i) => (
              <OptionRow
                key={i}
                index={i}
                total={4}
                text={localized(opt, language)}
                state={state.pendingSelection === i ? 'selected' : 'default'}
                stateLabel={state.pendingSelection === i ? t('exam.selected') : undefined}
                onPress={() => dispatch({ type: 'select', index: i as OptionIndex })}
                testID={`exam-option-${i}`}
              />
            ))}
          </View>
        </>
      )}

      <View style={styles.actions}>
        {state.config.allowBackNavigation && state.position > 0 && (
          <Button.Secondary label={t('exam.previous')} onPress={() => dispatch({ type: 'previous' })} testID="exam-previous" />
        )}
        <Button.Primary label={isLast ? t('exam.finish') : t('exam.next')} disabled={!canSubmit} onPress={() => dispatch({ type: 'next', at: now() })} testID="exam-next" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: space.sm },
  actions: { marginTop: 'auto', gap: space.sm, paddingBottom: space.lg },
});
