import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PreExamRules } from '@/components/PreExamRules';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EXAM_CONFIG } from '@/engine/exam-config';
import { useI18n } from '@/i18n/use-i18n';

export default function ExamIntroScreen() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Screen testID="exam-intro">
      <ScreenHeader title={t('preExam.title')} back />
      <LanguageToggle />
      <PreExamRules config={EXAM_CONFIG} />
      <Button.Primary label={t('preExam.start')} onPress={() => router.replace('/exam/session')} testID="start-exam" />
    </Screen>
  );
}
