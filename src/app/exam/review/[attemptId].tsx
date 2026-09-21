import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { OptionRow, type OptionState } from '@/components/OptionRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Segmented } from '@/components/Segmented';
import { SignArt } from '@/components/SignArt';
import { localized, questionById } from '@/content';
import { loadAttempt, type LoadedAttempt } from '@/db/attempts';
import { useDb } from '@/db/provider';
import { bookmarkedIds, toggleBookmark } from '@/db/queries';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';
import type { PaperItem } from '@/engine/session';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

type Filter = 'all' | 'wrong';

/** Where the learning actually happens: every question, the user's answer and
 *  the correct one both marked (icon + colour), then the explanation. */
export default function ReviewScreen() {
  const { t } = useI18n();
  const db = useDb();
  const { palette } = useTheme();
  const { language } = usePrefs();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const [loaded, setLoaded] = useState<LoadedAttempt | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let live = true;
    Promise.all([loadAttempt(db, Number(attemptId)), bookmarkedIds(db)]).then(([a, b]) => {
      if (!live) return;
      setLoaded(a);
      setBookmarks(new Set(b.map((r) => r.question_id)));
    });
    return () => {
      live = false;
    };
  }, [db, attemptId]);

  const onBookmark = useCallback(
    async (questionId: string) => {
      const added = await toggleBookmark(db, questionId, Date.now());
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (added) next.add(questionId);
        else next.delete(questionId);
        return next;
      });
    },
    [db],
  );

  const items = useMemo(() => {
    const paper = loaded?.paper ?? [];
    return filter === 'wrong' ? paper.filter((p) => p.outcome !== 'correct') : paper;
  }, [loaded, filter]);

  const renderItem = useCallback(
    ({ item }: { item: PaperItem }) => {
      const q = questionById(item.questionId);
      const bookmarked = bookmarks.has(item.questionId);
      return (
        <Card style={styles.card} testID={`review-item-${item.position}`}>
          <View style={styles.cardHeader}>
            <AppText variant="caption" color="secondary">
              {t('review.question', { n: item.position + 1 })}
            </AppText>
            <IconButton
              icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
              accessibilityLabel={bookmarked ? t('review.removeBookmark') : t('review.bookmark')}
              onPress={() => void onBookmark(item.questionId)}
              testID={`review-bookmark-${item.position}`}
            />
          </View>
          {q === undefined ? (
            <AppText color="secondary">{t('review.missingQuestion')}</AppText>
          ) : (
            <>
              {q.signId !== null && <SignArt signId={q.signId} alt={q.signAlt === null ? '' : localized(q.signAlt, language)} size={140} />}
              <AppText variant="question">{localized(q.text, language)}</AppText>
              <View style={styles.options}>
                {q.options.map((opt, i) => {
                  const isCorrect = i === item.correctIndex;
                  const isChosen = i === item.selectedIndex;
                  const state: OptionState = isCorrect && isChosen ? 'correct' : isChosen ? 'incorrect' : isCorrect ? 'correctNotChosen' : 'default';
                  const stateLabel = isCorrect && isChosen ? t('review.correctAnswer') : isChosen ? t('review.yourAnswer') : isCorrect ? t('review.correctAnswer') : undefined;
                  return <OptionRow key={i} index={i} total={4} text={localized(opt, language)} state={state} stateLabel={stateLabel} />;
                })}
              </View>
              {item.selectedIndex === null && (
                <AppText variant="caption" color="danger">
                  {item.outcome === 'timeout' ? t('review.timedOut') : item.outcome === 'skipped' ? t('review.skipped') : t('review.notAnswered')}
                </AppText>
              )}
              <View style={[styles.explanation, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                <AppText variant="caption" color="secondary">
                  {t('review.why')}
                </AppText>
                <AppText>{localized(q.explanation, language)}</AppText>
                {q.legalRef !== null && (
                  <AppText variant="caption" color="secondary">
                    {q.legalRef}
                  </AppText>
                )}
              </View>
            </>
          )}
        </Card>
      );
    },
    [bookmarks, onBookmark, palette, t, language],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]} edges={['top', 'left', 'right']} testID="exam-review">
      <FlatList
        data={items}
        keyExtractor={(p) => String(p.position)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title={t('review.title')} back />
            <Segmented<Filter>
              accessibilityLabel={t('review.title')}
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('review.filterAll') },
                { value: 'wrong', label: t('review.filterWrong') },
              ]}
            />
            {loaded !== null && items.length === 0 && <AppText color="secondary">{t('review.allCorrect')}</AppText>}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: space.gutter, paddingBottom: space.xxxl, gap: space.lg },
  header: { gap: space.lg, paddingTop: space.md },
  card: { gap: space.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  options: { gap: space.sm },
  explanation: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.xs },
});
