import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AppText } from '@/components/AppText';
import { ReadinessCard } from '@/components/ReadinessCard';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDb } from '@/db/provider';
import { lastFiveCompletedMocks, type RecentMock } from '@/db/queries';
import { EXAM_CONFIG } from '@/engine/exam-config';
import { useI18n } from '@/i18n/use-i18n';

export default function ProgressScreen() {
  const { t } = useI18n();
  const db = useDb();
  const [recent, setRecent] = useState<readonly RecentMock[]>([]);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      lastFiveCompletedMocks(db).then((rows) => {
        if (live) setRecent(rows);
      });
      return () => {
        live = false;
      };
    }, [db]),
  );

  return (
    <Screen testID="progress">
      <ScreenHeader title={t('progress.title')} />
      <ReadinessCard recent={recent} passMark={EXAM_CONFIG.passMark} questionCount={EXAM_CONFIG.questionCount} />
      {recent.length === 0 && <AppText color="secondary">{t('progress.noAttempts')}</AppText>}
    </Screen>
  );
}
