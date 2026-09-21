import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { QuestionCard } from '@/components/QuestionCard';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { localized, questionById } from '@/content';
import { QUESTIONS, type Question } from '@/content/questions';
import { useDb } from '@/db/provider';
import { bookmarkedIds } from '@/db/queries';
import { recordFlashcard } from '@/db/stats';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { TOPICS } from '@/engine/exam-config';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

/** A deck of the bank (or one topic). Reveal, then self-assess with two large
 *  buttons — accessible to everyone, unlike a swipe-only deck. Writes the
 *  all-modes counters only (docs/04-App-Flow.md §4). */
export default function FlashcardsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const db = useDb();
  const { palette } = useTheme();
  const { language } = usePrefs();
  const { topic, set } = useLocalSearchParams<{ topic?: string; set?: string }>();
  const [bookmarkDeck, setBookmarkDeck] = useState<readonly Question[] | null>(null);
  useEffect(() => {
    if (set !== 'bookmarks') return;
    let live = true;
    bookmarkedIds(db).then((rows) => {
      if (live) setBookmarkDeck(rows.map((r) => questionById(r.question_id)).filter((q): q is Question => q !== undefined));
    });
    return () => {
      live = false;
    };
  }, [db, set]);
  const deck = useMemo(() => {
    if (set === 'bookmarks') return bookmarkDeck ?? [];
    return topic !== undefined && (TOPICS as readonly string[]).includes(topic) ? QUESTIONS.filter((q) => q.topic === topic) : QUESTIONS;
  }, [topic, set, bookmarkDeck]);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);

  const card = deck[position];
  const finished = card === undefined;
  const loading = set === 'bookmarks' && bookmarkDeck === null;

  const assess = async (knewIt: boolean) => {
    if (card === undefined) return;
    await recordFlashcard(db, card.id, card.topic, knewIt, Date.now());
    if (knewIt) setKnown((k) => k + 1);
    else setUnknown((u) => u + 1);
    setRevealed(false);
    setPosition((p) => p + 1);
  };

  const restart = () => {
    setPosition(0);
    setRevealed(false);
    setKnown(0);
    setUnknown(0);
  };

  return (
    <Screen testID="flashcards">
      <ScreenHeader title={t('learn.flashcards.title')} back />
      {loading ? null : finished ? (
        <Card testID="flashcards-done">
          <AppText variant="heading">{t('learn.flashcards.done')}</AppText>
          <AppText color="secondary">{t('learn.flashcards.summary', { known, unknown })}</AppText>
          <View style={styles.actions}>
            <Button.Primary label={t('learn.flashcards.again')} onPress={restart} />
            <Button.Secondary label={t('learn.flashcards.back')} onPress={() => router.back()} />
          </View>
        </Card>
      ) : (
        <>
          <AppText variant="caption" color="secondary" testID="flashcards-progress">
            {t('learn.flashcards.progress', { current: position + 1, total: deck.length })}
          </AppText>
          <Card testID="flashcard">
            <QuestionCard text={localized(card.text, language)} signId={card.signId} signAlt={card.signAlt === null ? null : localized(card.signAlt, language)} />
            {revealed && (
              <View style={[styles.answer, { backgroundColor: palette.bg, borderColor: palette.border }]} testID="flashcard-answer">
                <AppText variant="option" weight="600" color="success">
                  {localized(card.options[card.answerIndex], language)}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {localized(card.explanation, language)}
                </AppText>
              </View>
            )}
          </Card>
          {!revealed ? (
            <Button.Primary label={t('learn.flashcards.showAnswer')} onPress={() => setRevealed(true)} testID="flashcard-reveal" />
          ) : (
            <View style={styles.actions}>
              <Button.Primary label={t('learn.flashcards.knewIt')} onPress={() => void assess(true)} testID="flashcard-knew" />
              <Button.Secondary label={t('learn.flashcards.didntKnow')} onPress={() => void assess(false)} testID="flashcard-unknown" />
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space.sm },
  answer: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.xs },
});
