import { StyleSheet } from 'react-native';

import type { RecentMock } from '@/db/queries';
import { READINESS_WINDOW } from '@/db/queries';
import { useI18n } from '@/i18n/use-i18n';

import { AppText } from './AppText';
import { Card } from './Card';

export interface ReadinessCardProps {
  recent: readonly RecentMock[];
  passMark: number;
  questionCount: number;
}

/** One number and one honest sentence. States what the numbers say and lets
 *  the user judge — no likelihood-of-passing figure, we have no data for one.
 *  The formula is docs/05-Data-Schema.md §5 and appears nowhere else. */
export function ReadinessCard({ recent, passMark, questionCount }: ReadinessCardProps) {
  const { t } = useI18n();
  let text: string;
  if (recent.length === 0) {
    text = t('home.readiness.empty');
  } else if (recent.length < READINESS_WINDOW) {
    text = t('home.readiness.fewer', { passMark, questionCount, n: recent.length });
  } else {
    const pct = Math.round(recent.reduce((s, r) => s + r.pct, 0) / recent.length);
    text = t('home.readiness.summary', { passMark, questionCount, pct, n: recent.length });
  }
  return (
    <Card testID="readiness-card">
      <AppText variant="body" style={styles.text}>
        {text}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({ text: { paddingVertical: 4 } });
