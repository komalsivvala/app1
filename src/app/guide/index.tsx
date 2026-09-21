import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useI18n } from '@/i18n/use-i18n';

/** M5 fills this from guide.json with a lastVerified date on every fee and rule. */
export default function GuideScreen() {
  const { t } = useI18n();
  return (
    <Screen testID="guide">
      <ScreenHeader title={t('home.guide')} back />
      <AppText color="secondary">{t('learn.placeholder')}</AppText>
    </Screen>
  );
}
