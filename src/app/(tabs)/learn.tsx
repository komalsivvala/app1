import { useMemo } from 'react';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TopicCard } from '@/components/TopicCard';
import { QUESTIONS } from '@/content/questions';
import type { TopicId } from '@/engine/exam-config';
import { useI18n } from '@/i18n/use-i18n';

const TOPICS: readonly TopicId[] = ['road-signs', 'rules-of-road-regulations', 'general-driving-principles'];

export default function LearnScreen() {
  const { t } = useI18n();
  // 277 questions: counting on each render would be fine; memoised anyway.
  const counts = useMemo(() => {
    const c: Record<TopicId, number> = { 'road-signs': 0, 'rules-of-road-regulations': 0, 'general-driving-principles': 0 };
    for (const q of QUESTIONS) c[q.topic] += 1;
    return c;
  }, []);

  return (
    <Screen testID="learn">
      <ScreenHeader title={t('learn.title')} />
      <AppText color="secondary">{t('learn.browse')}</AppText>
      {TOPICS.map((topic) => (
        <TopicCard key={topic} title={t(`topics.${topic}`)} subtitle={t('common.questions', { count: counts[topic] })} accuracyPct={null} />
      ))}
      <AppText variant="caption" color="secondary">
        {t('learn.placeholder')}
      </AppText>
    </Screen>
  );
}
