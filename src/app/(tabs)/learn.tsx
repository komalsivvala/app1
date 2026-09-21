import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchField } from '@/components/SearchField';
import { TopicCard } from '@/components/TopicCard';
import { QUESTIONS } from '@/content/questions';
import { TOPICS, type TopicId } from '@/engine/exam-config';
import { useI18n } from '@/i18n/use-i18n';

export default function LearnScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const counts = useMemo(() => {
    const c: Record<TopicId, number> = { 'road-signs': 0, 'rules-of-road-regulations': 0, 'general-driving-principles': 0 };
    for (const q of QUESTIONS) c[q.topic] += 1;
    return c;
  }, []);

  return (
    <Screen testID="learn">
      <ScreenHeader title={t('learn.title')} />
      {/* Tapping the field opens the search screen, where the index is built lazily. */}
      <Card onPress={() => router.push('/learn/search')} accessibilityLabel={t('learn.search.a11y')} testID="learn-search-entry" style={{ padding: 0, borderWidth: 0 }}>
        <SearchField value="" onChangeText={() => router.push('/learn/search')} placeholder={t('learn.search.placeholder')} accessibilityLabel={t('learn.search.a11y')} />
      </Card>
      <AppText color="secondary">{t('learn.browse')}</AppText>
      {TOPICS.map((topic) => (
        <TopicCard
          key={topic}
          title={t(`topics.${topic}`)}
          subtitle={t('learn.count', { count: counts[topic] })}
          accuracyPct={null}
          onPress={() => router.push({ pathname: '/learn/[topic]', params: { topic } })}
        />
      ))}
      <Card onPress={() => router.push('/learn/flashcards')} accessibilityLabel={t('learn.flashcards.entry')} accessibilityHint={t('learn.flashcards.entrySubtitle')} testID="learn-flashcards-entry">
        <AppText variant="heading">{t('learn.flashcards.entry')}</AppText>
        <AppText variant="caption" color="secondary">
          {t('learn.flashcards.entrySubtitle')}
        </AppText>
      </Card>
    </Screen>
  );
}
