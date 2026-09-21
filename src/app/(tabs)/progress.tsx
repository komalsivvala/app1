import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ReadinessCard } from '@/components/ReadinessCard';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TopicBar } from '@/components/TopicBar';
import { questionById } from '@/content';
import { completedMockHistory, type HistoryRow } from '@/db/attempts';
import { useDb } from '@/db/provider';
import { bookmarkedIds, lastFiveCompletedMocks, perTopicAccuracy, type RecentMock, type TopicAccuracy } from '@/db/queries';
import { useTheme } from '@/design/theme';
import { space, touch } from '@/design/tokens';
import { EXAM_CONFIG } from '@/engine/exam-config';
import { useI18n } from '@/i18n/use-i18n';

/** Readiness · history · per-topic accuracy · practice · bookmarks.
 *  Everything is computed on-device from completed MOCK attempts only. */
export default function ProgressScreen() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const db = useDb();
  const { palette } = useTheme();
  const [recent, setRecent] = useState<readonly RecentMock[]>([]);
  const [history, setHistory] = useState<readonly HistoryRow[]>([]);
  const [topics, setTopics] = useState<readonly TopicAccuracy[]>([]);
  const [bookmarkCount, setBookmarkCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      Promise.all([lastFiveCompletedMocks(db), completedMockHistory(db), perTopicAccuracy(db), bookmarkedIds(db)]).then(([r, h, tp, b]) => {
        if (!live) return;
        setRecent(r);
        setHistory(h);
        setTopics(tp);
        // Dangling IDs after a content update are filtered at read time.
        setBookmarkCount(b.filter((row) => questionById(row.question_id) !== undefined).length);
      });
      return () => {
        live = false;
      };
    }, [db]),
  );

  const hasMock = history.length > 0;
  const fmt = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Screen testID="progress">
      <ScreenHeader title={t('progress.title')} />
      <ReadinessCard recent={recent} passMark={EXAM_CONFIG.passMark} questionCount={EXAM_CONFIG.questionCount} />

      {hasMock ? (
        <Button.Primary label={t('progress.practiceWeak')} onPress={() => router.push('/practice/session')} testID="practice-weak" />
      ) : (
        <AppText color="secondary" testID="practice-empty">
          {t('progress.practiceEmpty')}
        </AppText>
      )}

      {topics.length > 0 && (
        <Card testID="progress-topics">
          <AppText variant="heading">{t('progress.byTopic')}</AppText>
          {topics.map((row) => (
            <TopicBar key={row.topic} label={t(`topics.${row.topic}`)} valueLabel={t('progress.topicLine', { pct: Math.round(row.pct), answered: row.answered })} fraction={row.pct / 100} />
          ))}
        </Card>
      )}

      {hasMock && (
        <Card testID="progress-history">
          <AppText variant="heading">{t('progress.history')}</AppText>
          {history.map((h) => {
            const passed = h.passed === 1;
            return (
              <Pressable
                key={h.id}
                accessibilityRole="button"
                accessibilityLabel={`${fmt.format(new Date(h.started_at))}. ${t('progress.attemptScore', { correct: h.correct_count, total: h.question_count })}. ${passed ? t('progress.passed') : t('progress.notPassed')}`}
                accessibilityHint={t('progress.openReview')}
                onPress={() => router.push({ pathname: '/exam/review/[attemptId]', params: { attemptId: String(h.id) } })}
                style={({ pressed }) => [styles.row, { borderBottomColor: palette.border }, pressed && styles.pressed]}
                testID={`history-${h.id}`}
              >
                <View style={styles.rowText}>
                  <AppText>{t('progress.attemptScore', { correct: h.correct_count, total: h.question_count })}</AppText>
                  <AppText variant="caption" color="secondary">
                    {fmt.format(new Date(h.started_at))}
                    {h.timing_reliable === 0 ? ` · ${t('progress.untimed')}` : ''}
                  </AppText>
                </View>
                <View style={styles.verdict}>
                  <Ionicons name={passed ? 'checkmark-circle' : 'close-circle'} size={20} color={passed ? palette.success.fill : palette.danger.fill} />
                  <AppText variant="caption" color={passed ? 'success' : 'danger'}>
                    {passed ? t('progress.passed') : t('progress.notPassed')}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}

      {!hasMock && <AppText color="secondary">{t('progress.noAttempts')}</AppText>}

      <Card onPress={() => router.push('/bookmarks')} accessibilityLabel={t('progress.bookmarks')} accessibilityHint={t('progress.bookmarksCount', { count: bookmarkCount })} testID="progress-bookmarks">
        <AppText variant="heading">{t('progress.bookmarks')}</AppText>
        <AppText variant="caption" color="secondary">
          {t('progress.bookmarksCount', { count: bookmarkCount })}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touch.min, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: 2 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  pressed: { opacity: 0.7 },
});
