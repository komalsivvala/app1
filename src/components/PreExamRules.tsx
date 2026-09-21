import { StyleSheet, View } from 'react-native';

import type { ExamConfig } from '@/engine/exam-config';
import { useI18n } from '@/i18n/use-i18n';

import { AppText } from './AppText';

/** The real test's rules, pulled LIVE from exam-config.json so this screen can
 *  never contradict the engine. Pure in its props, so it is unit-tested against
 *  every timing mode and the null formatVerifiedOn case. */
export function PreExamRules({ config }: { config: ExamConfig }) {
  const { t, lang } = useI18n();
  const timing =
    config.timing.mode === 'per-question'
      ? t('preExam.rules.perQuestion', { seconds: config.timing.secondsPerQuestion ?? 0 })
      : t('preExam.rules.wholePaper', { minutes: Math.round((config.timing.totalSeconds ?? 0) / 60) });

  const lines = [
    t('preExam.rules.questions', { count: config.questionCount }),
    t('preExam.rules.passMark', { count: config.passMark }),
    timing,
    config.allowBackNavigation ? t('preExam.rules.canBack') : t('preExam.rules.noBack'),
    config.negativeMark > 0 ? t('preExam.rules.negative', { marks: config.negativeMark }) : t('preExam.rules.noNegative'),
  ];

  const format =
    config.formatVerifiedOn === null
      ? t('preExam.formatUnverified')
      : t('preExam.formatVerified', {
          date: new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(`${config.formatVerifiedOn}T00:00:00`)),
        });

  return (
    <View style={styles.block} accessibilityRole="summary">
      {lines.map((line) => (
        <AppText key={line} variant="body" testID="pre-exam-rule">
          {line}
        </AppText>
      ))}
      <AppText variant="caption" color="secondary" style={styles.format} testID="pre-exam-format">
        {format}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ block: { gap: 8 }, format: { marginTop: 8 } });
