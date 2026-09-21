import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { OptionRow, type OptionState } from '@/components/OptionRow';
import { QuestionCard } from '@/components/QuestionCard';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { localized, questionById } from '@/content';
import { QUESTIONS } from '@/content/questions';
import { useDb } from '@/db/provider';
import { bookmarkedIds, toggleBookmark } from '@/db/queries';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import type { OptionIndex } from '@/engine/session';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

/** Learn-mode detail: try an option (or just reveal), then the explanation.
 *  Nothing here writes question_stats — only exams and flashcards do. */
export default function QuestionDetailScreen() {
  const { id, topic } = useLocalSearchParams<{ id: string; topic?: string }>();
  // Keyed on the id: moving to the next question mounts a fresh detail, so
  // the "chosen / revealed" state resets by construction, not by an effect.
  return <QuestionDetail key={id ?? ''} id={id} topic={topic} />;
}

function QuestionDetail({ id, topic }: { id: string | undefined; topic: string | undefined }) {
  const { t } = useI18n();
  const router = useRouter();
  const db = useDb();
  const { palette } = useTheme();
  const { language } = usePrefs();
  const question = id === undefined ? undefined : questionById(id);
  const [chosen, setChosen] = useState<OptionIndex | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    let live = true;
    bookmarkedIds(db).then((rows) => {
      if (live) setBookmarked(rows.some((r) => r.question_id === id));
    });
    return () => {
      live = false;
    };
  }, [db, id]);

  const nextId = useMemo(() => {
    if (question === undefined) return null;
    const siblings = QUESTIONS.filter((q) => q.topic === (topic ?? question.topic));
    const i = siblings.findIndex((q) => q.id === question.id);
    return i >= 0 && i + 1 < siblings.length ? (siblings[i + 1]?.id ?? null) : null;
  }, [question, topic]);

  const onBookmark = useCallback(async () => {
    if (question === undefined) return;
    setBookmarked(await toggleBookmark(db, question.id, Date.now()));
  }, [db, question]);

  if (question === undefined) {
    return (
      <Screen testID="question-missing">
        <ScreenHeader title={t('question.title')} back />
        <AppText color="danger">{t('question.missing')}</AppText>
      </Screen>
    );
  }

  const stateFor = (i: number): OptionState => {
    if (!revealed) return chosen === i ? 'selected' : 'default';
    const isCorrect = i === question.answerIndex;
    if (isCorrect) return chosen === null || chosen === i ? 'correct' : 'correctNotChosen';
    return chosen === i ? 'incorrect' : 'default';
  };

  return (
    <Screen testID="question-detail">
      <ScreenHeader
        title={t('question.title')}
        back
        right={<IconButton icon={bookmarked ? 'bookmark' : 'bookmark-outline'} accessibilityLabel={bookmarked ? t('question.removeBookmark') : t('question.bookmark')} onPress={() => void onBookmark()} testID="question-bookmark" />}
      />
      <QuestionCard text={localized(question.text, language)} signId={question.signId} signAlt={question.signAlt === null ? null : localized(question.signAlt, language)} />
      {question.signId !== null && (
        <Card onPress={() => router.push({ pathname: '/signs/[signId]', params: { signId: question.signId } })} accessibilityLabel={t('question.seeSign')} style={styles.quiet}>
          <AppText variant="caption" color="accent">
            {t('question.seeSign')}
          </AppText>
        </Card>
      )}
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
              setChosen(i as OptionIndex);
              setRevealed(true);
            }}
            testID={`question-option-${i}`}
          />
        ))}
      </View>
      {!revealed ? (
        <Button.Secondary label={t('question.showAnswer')} onPress={() => setRevealed(true)} testID="question-reveal" />
      ) : (
        <>
          {chosen !== null && (
            <View style={styles.verdict}>
              <Ionicons name={chosen === question.answerIndex ? 'checkmark-circle' : 'close-circle'} size={22} color={chosen === question.answerIndex ? palette.success.fill : palette.danger.fill} />
              <AppText color={chosen === question.answerIndex ? 'success' : 'danger'}>{chosen === question.answerIndex ? t('question.correct') : t('question.incorrect')}</AppText>
            </View>
          )}
          <View style={[styles.explanation, { backgroundColor: palette.surface, borderColor: palette.border }]} testID="question-explanation">
            <AppText variant="caption" color="secondary">
              {t('question.why')}
            </AppText>
            <AppText>{localized(question.explanation, language)}</AppText>
            {question.legalRef !== null && (
              <AppText variant="caption" color="secondary">
                {question.legalRef}
              </AppText>
            )}
          </View>
        </>
      )}
      {nextId !== null && <Button.Primary label={t('question.next')} onPress={() => router.replace({ pathname: '/question/[id]', params: { id: nextId, topic: topic ?? question.topic } })} testID="question-next" />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: space.sm },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  explanation: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.xs },
  quiet: { backgroundColor: 'transparent', paddingVertical: space.sm },
});
