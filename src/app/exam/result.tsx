import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TopicBar } from '@/components/TopicBar';
import { loadAttempt, type LoadedAttempt } from '@/db/attempts';
import { useDb } from '@/db/provider';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { TOPICS } from '@/engine/exam-config';
import { useI18n } from '@/i18n/use-i18n';

/** Verdict first, unambiguously, with an icon so it reads without colour.
 *  Then the score, the per-topic breakdown, and Review as the primary action —
 *  not Retake. A pass gets a calm checkmark; a fail gets encouragement. */
export default function ResultScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const db = useDb();
  const { palette } = useTheme();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const [loaded, setLoaded] = useState<LoadedAttempt | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    loadAttempt(db, Number(attemptId)).then((a) => {
      if (live) setLoaded(a);
    });
    return () => {
      live = false;
    };
  }, [db, attemptId]);

  if (loaded === undefined) return <Screen testID="result-loading">{null}</Screen>;
  if (loaded === null) {
    return (
      <Screen testID="result-missing">
        <AppText color="danger">{t('result.notFound')}</AppText>
        <Button.Primary label={t('result.home')} onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const { attempt, config, paper } = loaded;
  const passed = attempt.passed === 1;
  const verdictColor = passed ? 'success' : 'danger';

  return (
    <Screen testID="exam-result">
      <View style={styles.verdict} accessibilityRole="header" accessibilityLabel={`${passed ? t('result.passed') : t('result.notPassed')}. ${t('result.score', { correct: attempt.correct_count, total: attempt.question_count })}`}>
        <Ionicons name={passed ? 'checkmark-circle' : 'close-circle'} size={48} color={passed ? palette.success.fill : palette.danger.fill} />
        <AppText variant="display" color={verdictColor} testID="result-verdict">
          {passed ? t('result.passed') : t('result.notPassed')}
        </AppText>
        <AppText variant="title" testID="result-score">
          {t('result.score', { correct: attempt.correct_count, total: attempt.question_count })}
        </AppText>
        <AppText variant="caption" color="secondary">
          {t('result.needed', { passMark: attempt.pass_mark ?? config.passMark })}
        </AppText>
      </View>

      {!passed && <AppText color="secondary">{t('result.encouragement')}</AppText>}
      {attempt.timing_reliable === 0 && (
        <AppText variant="caption" color="secondary">
          {t('result.unreliable')}
        </AppText>
      )}

      <Card>
        <AppText variant="heading">{t('result.byTopic')}</AppText>
        {TOPICS.map((topic) => {
          const rows = paper.filter((p) => p.topic === topic);
          if (rows.length === 0) return null;
          const correct = rows.filter((p) => p.outcome === 'correct').length;
          return <TopicBar key={topic} label={t(`topics.${topic}`)} valueLabel={t('result.topicLine', { correct, total: rows.length })} fraction={correct / rows.length} />;
        })}
      </Card>

      <Button.Primary label={t('result.review')} onPress={() => router.push({ pathname: '/exam/review/[attemptId]', params: { attemptId: String(attempt.id) } })} testID="result-review" />
      <Button.Secondary label={t('result.home')} onPress={() => router.replace('/')} testID="result-home" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  verdict: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
});
