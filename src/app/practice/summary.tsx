import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { QuestionListRow } from '@/components/QuestionListRow';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { localized, questionById } from '@/content';
import { loadAttempt, type LoadedAttempt } from '@/db/attempts';
import { useDb } from '@/db/provider';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

export default function PracticeSummaryScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const db = useDb();
  const { language } = usePrefs();
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const [loaded, setLoaded] = useState<LoadedAttempt | null>(null);

  useEffect(() => {
    let live = true;
    loadAttempt(db, Number(attemptId)).then((a) => {
      if (live) setLoaded(a);
    });
    return () => {
      live = false;
    };
  }, [db, attemptId]);

  if (loaded === null) return <Screen testID="practice-summary-loading">{null}</Screen>;

  const correct = loaded.paper.filter((p) => p.outcome === 'correct').length;
  const revisit = loaded.paper.filter((p) => p.outcome !== 'correct');

  return (
    <Screen testID="practice-summary">
      <ScreenHeader title={t('practice.summary.title')} />
      <AppText variant="display" testID="practice-score">
        {t('practice.summary.score', { correct, total: loaded.paper.length })}
      </AppText>
      <Card>
        <AppText variant="heading">{t('practice.summary.revisit')}</AppText>
        {revisit.length === 0 ? (
          <AppText color="secondary">{t('practice.summary.allCorrect')}</AppText>
        ) : (
          revisit.map((p, i) => {
            const q = questionById(p.questionId);
            if (q === undefined) return null;
            const alt = q.signAlt === null ? null : localized(q.signAlt, language);
            return (
              <QuestionListRow
                key={p.questionId}
                index={i + 1}
                text={q.signId !== null && alt !== null ? alt : localized(q.text, language)}
                signId={q.signId}
                signAlt={alt}
                onPress={() => router.push({ pathname: '/question/[id]', params: { id: q.id } })}
                testID={`practice-revisit-${i}`}
              />
            );
          })
        )}
      </Card>
      <Button.Primary label={t('practice.summary.again')} onPress={() => router.replace('/practice/session')} testID="practice-again" />
      <Button.Secondary label={t('practice.summary.done')} onPress={() => router.dismissTo('/progress')} testID="practice-done" />
    </Screen>
  );
}
