import { useRouter } from 'expo-router';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useI18n } from '@/i18n/use-i18n';

/** M3 replaces this with the exam engine. No tab bar, no back affordance. */
export default function ExamSessionScreen() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Screen scroll={false} testID="exam-session">
      <AppText variant="heading">{t('preExam.title')}</AppText>
      <AppText color="secondary">{t('exam.placeholder')}</AppText>
      <Button.Secondary label={t('common.back')} onPress={() => router.replace('/')} />
    </Screen>
  );
}
