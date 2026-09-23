import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Segmented } from '@/components/Segmented';
import { CONTENT } from '@/content/questions';
import { useDb } from '@/db/provider';
import { AVAILABLE_LANGUAGES } from '@/i18n';
import { useI18n } from '@/i18n/use-i18n';
import { usePrefs, type ThemePref } from '@/state/prefs';
import { isActionable } from '@/updates/state';
import { useContentUpdates } from '@/updates/use-content-updates';

const THEME_OPTIONS: readonly ThemePref[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const db = useDb();
  const { themePref, setThemePref } = usePrefs();
  const updates = useContentUpdates();

  const resetProgress = () => {
    Alert.alert(t('settings.resetProgress.confirmTitle'), t('settings.resetProgress.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.resetProgress.confirm'),
        style: 'destructive',
        onPress: () => {
          // Answers cascade from attempts; the rest are independent tables.
          db.execAsync('DELETE FROM attempts; DELETE FROM question_stats; DELETE FROM bookmarks;');
        },
      },
    ]);
  };

  return (
    <Screen testID="settings">
      <ScreenHeader title={t('settings.title')} back />

      {AVAILABLE_LANGUAGES.length > 1 && (
        <Card>
          <AppText variant="heading">{t('settings.language')}</AppText>
          <LanguageToggle />
        </Card>
      )}

      <Card>
        <AppText variant="heading">{t('settings.theme.label')}</AppText>
        <Segmented
          accessibilityLabel={t('settings.theme.label')}
          value={themePref}
          onChange={setThemePref}
          options={THEME_OPTIONS.map((o) => ({
            value: o,
            label: t(`settings.theme.${o}`),
            accessibilityLabel: t('a11y.themeOption', { option: t(`settings.theme.${o}`) }),
          }))}
        />
      </Card>

      <Card>
        <AppText variant="heading">{t('settings.textSize.label')}</AppText>
        <AppText variant="caption" color="secondary">
          {t('settings.textSize.hint')}
        </AppText>
      </Card>

      <Card testID="settings-updates">
        <AppText variant="heading">{t('settings.updates.label')}</AppText>
        <AppText variant="caption" color="secondary">
          {t('settings.updates.version', { version: CONTENT.contentVersion })}
        </AppText>
        <AppText variant="caption" color="secondary">
          {t('settings.updates.hint')}
        </AppText>
        {updates.status === 'unavailable' ? (
          <AppText variant="caption" color="secondary" testID="settings-updates-unavailable">
            {t('settings.updates.unavailable')}
          </AppText>
        ) : (
          <Button.Secondary label={t(`settings.updates.${updates.status}`)} onPress={updates.press} disabled={!isActionable(updates.status)} testID="settings-updates-button" />
        )}
      </Card>

      <Card onPress={resetProgress} accessibilityLabel={t('settings.resetProgress.label')} accessibilityHint={t('settings.resetProgress.confirmBody')}>
        <AppText variant="heading" color="danger">
          {t('settings.resetProgress.label')}
        </AppText>
      </Card>

      <Card onPress={() => router.push('/about')} accessibilityLabel={t('settings.about')}>
        <AppText variant="heading">{t('settings.about')}</AppText>
      </Card>
    </Screen>
  );
}
