import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useI18n } from '@/i18n/use-i18n';

export default function SignsScreen() {
  const { t } = useI18n();
  return (
    <Screen testID="signs">
      <ScreenHeader title={t('signs.title')} />
      <AppText color="secondary">{t('signs.placeholder')}</AppText>
    </Screen>
  );
}
