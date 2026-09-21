import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ReadinessCard } from '@/components/ReadinessCard';
import { Screen } from '@/components/Screen';
import { useDb } from '@/db/provider';
import { lastFiveCompletedMocks, type RecentMock } from '@/db/queries';
import { space } from '@/design/tokens';
import { EXAM_CONFIG } from '@/engine/exam-config';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs } from '@/state/prefs';

export default function HomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const db = useDb();
  const { languageChosen } = usePrefs();
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

  // Only reachable with more than one shipped language and no choice made yet.
  if (!languageChosen) return <Redirect href="/language" />;

  return (
    <Screen testID="home">
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <AppText variant="title" accessibilityRole="header">
            {t('app.name')}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t('app.tagline')}
          </AppText>
        </View>
        <LanguageToggle />
        <IconButton icon="settings-outline" accessibilityLabel={t('a11y.settingsButton')} onPress={() => router.push('/settings')} testID="open-settings" />
      </View>

      <ReadinessCard recent={recent} passMark={EXAM_CONFIG.passMark} questionCount={EXAM_CONFIG.questionCount} />

      <Button.Primary label={t('home.startMock')} onPress={() => router.push('/exam/intro')} testID="start-mock" />

      <Card onPress={() => router.navigate('/learn')} accessibilityLabel={t('home.cards.learn.title')} accessibilityHint={t('home.cards.learn.subtitle')}>
        <AppText variant="heading">{t('home.cards.learn.title')}</AppText>
        <AppText variant="caption" color="secondary">
          {t('home.cards.learn.subtitle')}
        </AppText>
      </Card>
      <Card onPress={() => router.navigate('/signs')} accessibilityLabel={t('home.cards.signs.title')} accessibilityHint={t('home.cards.signs.subtitle')}>
        <AppText variant="heading">{t('home.cards.signs.title')}</AppText>
        <AppText variant="caption" color="secondary">
          {t('home.cards.signs.subtitle')}
        </AppText>
      </Card>
      {/* Hidden until there is data — don't show an empty promise. */}
      {recent.length > 0 && (
        <Card onPress={() => router.navigate('/progress')} accessibilityLabel={t('home.cards.weakAreas.title')} accessibilityHint={t('home.cards.weakAreas.subtitle')}>
          <AppText variant="heading">{t('home.cards.weakAreas.title')}</AppText>
          <AppText variant="caption" color="secondary">
            {t('home.cards.weakAreas.subtitle')}
          </AppText>
        </Card>
      )}

      <Card onPress={() => router.push('/guide')} accessibilityLabel={t('home.guide')} style={styles.quietRow}>
        <AppText variant="body" color="secondary">
          {t('home.guide')}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  titleBlock: { flex: 1 },
  quietRow: { backgroundColor: 'transparent' },
});
